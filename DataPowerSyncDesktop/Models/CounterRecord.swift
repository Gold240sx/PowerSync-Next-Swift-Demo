//
//  CounterRecord.swift
//  DataPowerSync
//
//  Created by Michael Martell on 10/5/25.
//

import Foundation

struct CounterRecord: Identifiable, Equatable {
    let id: String
    var count: Int
    let ownerId: String?
    let createdAt: Date
}

