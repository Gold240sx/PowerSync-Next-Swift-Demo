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



struct ContentView: View {
    @State var counters: [CounterRecord] = []
    let userID = UUID().uuidString
    
    let powerSync = PowerSyncDatabase(
        schema: powerSyncSchema,
        dbFilename: "my-demo.sqlite"
      )
    
    var body: some View {
        VStack {
            List(counters) { counter in
                CounterRecordView(
                    counter: counter,
                    onIncrement: {
                        Task {
                            do {
                                print("increment")
                                try await powerSync.execute(
                                    sql: """
                                        UPDATE counters
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
                                        DELETE FROM counters
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
            Button {
                Task {
                    // asyncronous and can handle exceptions (so wrap in do / catch block)
                    do {
                        try await powerSync.execute(
                            sql: """
                                INSERT INTO counters(id, count, owner_id, created_at)
                                VALUES(uuid(), 0, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
                                """,
                            parameters: [userID]
                        )
                    } catch {
                        print( "Could not create a counter: \(error)")
                    }
                }
            } label: {
                Text("Add Counter")
            }
        }.task {
            do {
                // map over all counters
                for try await results in try powerSync.watch(
                    options: WatchOptions(
                        sql: "SELECT * FROM counters ORDER BY created_at",
                        parameters: []
                    ) { cursor in
                        try CounterRecord(
                            id: cursor.getString(name: "id"),
                            count: cursor.getInt(name: "count"),
                            ownerId: cursor.getString(name: "owner_id"),
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
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
