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
                }
                Button {
                    onDelete()
                } label: {
                    Image(systemName: "trash")
                }
            }
            
            HStack {
                Text("Created At: \(counter.createdAt, formatter: DateFormatter())")
                Spacer()
                Text("Owner ID: \(counter.ownerId)")
            }
        }
    }
    
}

#Preview {
    CounterRecordView(
        counter: CounterRecord(
            id: UUID().uuidString,
            count: 900,
            ownerId: UUID().uuidString,
            createdAt: Date()
        ),
        onIncrement: {},
        onDelete: {}
    )
}
