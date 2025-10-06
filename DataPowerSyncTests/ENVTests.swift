//
//  ENVTests.swift
//  ENVTests
//
//  Created by Michael Martell on 10/6/25.
//

import XCTest

@testable import DataPowerSync

final class ENVTests: XCTestCase {
    func testPrintENVKeysAndValues() {
        let envTest = loadENV(map: ENVMap, showLogs: false)
        var missingOrEmpty: [String] = []

        print("==== ENV keys/values ====")
        for key in ENVMap.keys {
            // Using the dynamic member lookup to access the deobfuscated values
            let value = envTest[dynamicMember: key]
            if value.isEmpty {
                print("MISSING OR EMPTY: \(key)")
                missingOrEmpty.append(key)
            } else {
                // Print only first 3 chars of the value for security
                let maskedValue = value.count > 3 ? String(value.prefix(3)) + "..." : "..."
                print("\(key): \(maskedValue)")
            }
        }
        print("=========================")

        if !missingOrEmpty.isEmpty {
            XCTFail("The following ENV variables are missing or empty: \(missingOrEmpty)")
        }
    }
}
