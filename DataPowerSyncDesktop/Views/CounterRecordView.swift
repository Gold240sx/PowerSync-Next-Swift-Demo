//
//  CounterRecordView.swift
//  DataPowerSync
//
//  Created by Michael Martell on 10/5/25.
//

import Foundation
import SwiftUI

struct CounterRecordView: View {
    let counter: CounterRecord
    let onIncrement: () -> Void
    let onDelete: () -> Void
    
    
    var body: some View {
        VStack {
            HStack {
                Text("Count: \(counter.count)")
                Spacer()
                Button {
                    onIncrement()
                } label: {
                    Image(systemName: "plus")
                }.buttonStyle(.plain)
                Button {
                    onDelete()
                } label: {
                    Image(systemName: "trash.fill")
                }.buttonStyle(.plain)
            }
            
            HStack {
                Text("Created At: \(counter.createdAt.ISO8601Format())")
                Spacer()
                Text("Owner ID: \(counter.ownerId ?? "-")")
            }
        }
    }
    
}

#Preview {
    CounterRecordView(
        counter: CounterRecord(
            id: UUID().uuidString,
            count: 0,
            ownerId: UUID().uuidString,
            createdAt: Date()
        ),
        onIncrement: {},
        onDelete: {}
    )
}
