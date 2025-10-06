//
//  ContentView.swift
//  DataPowerSync
//
//  Created by Michael Martell on 10/5/25.
//

import Foundation
import SwiftUI
import SwiftData
import PowerSync
import Supabase



struct ContentView: View {
    @State var counters: [CounterRecord] = []
    @State var statusImageName = "wifi.slash"
    
    let powerSync = PowerSyncDatabase(
        schema: powerSyncSchema,
        dbFilename: "my-demo.sqlite"
      )
    
    let supabase = SupabaseConnector()
    
    var body: some View {
        VStack {
            List {
                ForEach(counters) { counter in
                    CounterRecordView(
                        counter: counter,
                        onIncrement: {
                            Task {
                                do {
                                    print("increment")
                                    try await powerSync.execute(
                                        sql: """
                                            UPDATE "\(AppConfig.DBprefix)counters"
                                            SET count = count + 1
                                            WHERE id = ?
                                            """,
                                        parameters: [counter.id]
                                    )
                                } catch {
                                    print( "Could not create a counter: \(error)")
                                }
                            }
                        },
                        onDelete: {
                            Task {
                                do {
                                    print("delete")
                                    try await powerSync.execute(
                                        sql: """
                                            DELETE FROM "\(AppConfig.DBprefix)counters"
                                            WHERE id = ?
                                            """,
                                        parameters: [counter.id]
                                    )
                                } catch {
                                    print( "Could not create a counter: \(error)")
                                }
                            }
                        }
                    )
                }
            }
            HStack {
                Button {
                    Task {
                        // asyncronous and can handle exceptions (so wrap in do / catch block)
                        do {
                            try await powerSync.execute(
                                sql: """
                                INSERT INTO "\(AppConfig.DBprefix)counters"(id, count, owner_id, created_at)
                                VALUES(uuid(), 0, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
                                """,
                                parameters: [
                                    /// This will use a signed in session id if the app has ever been signed in while online.
                                    /// We will set the owner_id when uploading if the session has not been started (initially offline)
                                    supabase.client.auth.currentSession?.user.id.uuidString
                                ]
                            )
                        } catch {
                            print( "Could not create a counter: \(error)")
                        }
                    }
                } label: {
                    Text("Add Counter")
                }
                Spacer()
                if (!powerSync.currentStatus.connecting && !powerSync.currentStatus.connected) {
                    Button {
                        Task {
                            do {
                                try await powerSync.connect(
                                    connector: supabase,
                                )
                            } catch {
                                print("could not connect: \(error)")
                            }
                        }
                    } label: {
                        Text("Connect")
                    }}
                if (powerSync.currentStatus.connecting && !powerSync.currentStatus.connected) {
                    Button {
                        Task {
                            do {
                                try await powerSync.disconnectAndClear()
                            } catch {
                                print("could not clear and disconnect: \(error)")
                            }
                        }
                    } label: {
                        Text(powerSync.currentStatus.connected ? "Disconnect and clear all" :"Syncing...")
                    }}
                if (powerSync.currentStatus.connecting && !powerSync.currentStatus.connected) {
                    Text("Connecting...")
                }
                Image(systemName: statusImageName)
                if (!powerSync.currentStatus.connecting && powerSync.currentStatus.connected) {
                    Button {
                        print("Sign out button pressed") // DEBUG print
                        Task {
                            do {
                                try await supabase.signOut()
                                try await powerSync.disconnect()
                            } catch {
                                print("could not sign out: \(error)")
                            }
                        }
                    } label: {
                        Text("Sign out")
                    }
                }
            }
        }.task {
            do {
                // map over all counters
                for try await results in try powerSync.watch(
                    options: WatchOptions(
                        sql: """
SELECT * FROM "\(AppConfig.DBprefix)counters" ORDER BY created_at
""",
                        parameters: []
                    ) { cursor in
                        try CounterRecord(
                            id: cursor.getString(name: "id"),
                            count: cursor.getInt(name: "count"),
                            ownerId: cursor.getStringOptional(name: "owner_id"),
                            createdAt: ISO8601DateFormatter().date(
                                from: cursor.getString(name: "created_at")
                            ) ?? Date()
                        )
                    }
                ) {
                    // for loop ending
                    counters = results
                }
            } catch {
                print("Could not watch counters: \(error)")
            }
        } .task {
            /// This updates the status icon from the PowerSync status
            for await status in powerSync.currentStatus.asFlow() {
                if status.connected {
                    statusImageName = "wifi"
                } else if status.connecting {
                    statusImageName = "wifi.exclamationmark"
                } else {
                    statusImageName = "wifi.slash"
                }
            }
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
