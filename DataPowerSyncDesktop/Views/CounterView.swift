//
//  CounterView.swift
//  DataPowerSync
//
//  Created by Michael Martell on 10/6/25.
//

import SwiftUI

struct CounterView: View {
    let counter: CounterRecord
    let onIncrement: () -> Void
    let onDelete: () -> Void

    var body: some View {
        VStack {
            HStack {
                Text("Count: \(counter.count)").font(.title)
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
                Text("Created at: \(counter.createdAt.ISO8601Format())")
                Spacer()
                Text("Owner id: \(counter.ownerId ?? "-")")
            }
        }
    }
}

#Preview {
    CounterView(
        counter:
        CounterRecord(
            id: UUID().uuidString,
            count: 0,
            ownerId: UUID().uuidString,
            createdAt: Date()
        ),
        onIncrement: {},
        onDelete: {}
    )
}
