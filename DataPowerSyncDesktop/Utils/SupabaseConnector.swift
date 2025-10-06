//
//  SupabaseConnector.swift
//  DataPowerSync
//
//  Created by Michael Martell on 10/6/25.
//

import Foundation
import PowerSync
import Supabase

final class SupabaseConnector: PowerSyncBackendConnectorProtocol {
    let client: SupabaseClient = .init(
        supabaseURL: URL(string: ENV.supabaseUrl)!,
        supabaseKey: ENV.supabasePublishableKey
    )
    
    //credentials for the client to connect to Supabase
    func fetchCredentials() async throws -> PowerSync.PowerSyncCredentials? {
        let session = try await getSession()
        
        return PowerSyncCredentials(
            endpoint: "https://68e2cd2fc06a8dded981bd92.powersync.journeyapps.com", // get from the dashboard https://ID.powersync....
            token: session.accessToken
        )
    }
    
    func uploadData(database: any PowerSync.PowerSyncDatabaseProtocol) async throws {
        guard let transaction = try await database.getNextCrudTransaction() else { return }

        let session = try await getSession()
        
        var lastEntry: CrudEntry?
        do {
            for entry in transaction.crud {
                lastEntry = entry
                let tableName = entry.table

                let table = client.from(tableName)

                switch entry.op {
                case .put:
                    var data = entry.opData ?? [:]
                    data["id"] = entry.id
                    /// Use the current user if we created the item before signing in
                    data["owner_id"] = data["owner_id"] ?? session.user.id.uuidString
                    try await table.upsert(data).execute()
                case .patch:
                    guard let opData = entry.opData else { continue }
                    try await table.update(opData).eq("id", value: entry.id).execute()
                case .delete:
                    try await table.delete().eq("id", value: entry.id).execute()
                }
            }

            try await transaction.complete()

        } catch {
            if let errorCode = PostgresFatalCodes.extractErrorCode(from: error),
               PostgresFatalCodes.isFatalError(errorCode)
            {
                /// Instead of blocking the queue with these errors,
                /// discard the (rest of the) transaction.
                ///
                /// Note that these errors typically indicate a bug in the application.
                /// If protecting against data loss is important, save the failing records
                /// elsewhere instead of discarding, and/or notify the user.
                print("Data upload error: \(error)")
                print("Discarding entry: \(lastEntry!)")
                try await transaction.complete()
                return
            }

            print("Data upload error - retrying last entry: \(lastEntry!), \(error)")
            throw error
        }
    }
    
    func signOut() async throws {
        print("SupabaseConnector.signOut called") // DEBUG print
        do {
            try await client.auth.signOut()
        } catch {
            print("Failed to sign out: \(error)")
        }
    }
    
    func getSession() async throws -> Session {
        // Use an existing session if present, or signing anonymously
        guard let session = try? await client.auth.session else {
            return try await client.auth.signInAnonymously()
            // ensure that sign in anonymously is allowed in the Supabase dashboard.
        }
        return session
    }
}

private enum PostgresFatalCodes {
    /// Postgres Response codes that we cannot recover from by retrying.
    static let fatalResponseCodes: [String] = [
        // Anonymous limit reached
        "0001",
        // Class 22 — Data Exception
        // Examples include data type mismatch.
        "22...",
        // Class 23 — Integrity Constraint Violation.
        // Examples include NOT NULL, FOREIGN KEY and UNIQUE violations.
        "23...",
        // INSUFFICIENT PRIVILEGE - typically a row-level security violation
        "42501",
    ]

    static func isFatalError(_ code: String) -> Bool {
        return fatalResponseCodes.contains { pattern in
            code.range(of: pattern, options: [.regularExpression]) != nil
        }
    }

    static func extractErrorCode(from error: any Error) -> String? {
        // Look for code: Optional("XXXXX") pattern
        let errorString = String(describing: error)
        if let range = errorString.range(of: "code: Optional\\(\"([^\"]+)\"\\)", options: .regularExpression),
           let codeRange = errorString[range].range(of: "\"([^\"]+)\"", options: .regularExpression)
        {
            // Extract just the code from within the quotes
            let code = errorString[codeRange].dropFirst().dropLast()
            return String(code)
        }
        return nil
    }
}
