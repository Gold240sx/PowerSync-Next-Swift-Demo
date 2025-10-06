//
//  AppSchema.swift
//  DataPowerSync
//
//  Created by Michael Martell on 10/5/25.
//

import Foundation
import PowerSync

/// This defines the PowerSync SQLite tables
let powerSyncSchema = Schema(
    tables: [
        Table(
            name: "\(AppConfig.DBprefix)counters",
            columns: [
                .integer("count"),
                .text("owner_id"),
                .text("created_at")
            ]
        )
    ]
)
