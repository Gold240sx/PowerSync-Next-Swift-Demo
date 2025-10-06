//
//  ENV.swift
//  DataPowerSync
//
//  Created by Michael Martell on 10/6/25.
//

import Foundation

// Map of variable names to Info.plist keys
let ENVMap: [String: String] = [
    "supabaseUrl": "SUPABASE_URL",
    "supabasePublishableKey": "SUPABASE_PUBLISHABLE_KEY",
    "devPassword": "DEV_PASSWORD"
//    "supabaseSecretKey": "SUPABASE_SECRET_KEY",
//    "gitClientId": "GIDClientID",
//    "devUserId": "DEV_USER_ID",
//    "devPassword": "DEV_PASSWORD"
]

// Random salt for XOR cipher - generated once at compile time
private let salt: [UInt8] = [
    0x8a, 0xf3, 0x21, 0xbc, 0x75, 0x9e, 0x4c, 0xd6,
    0x35, 0xf8, 0x12, 0xb9, 0x67, 0x0d, 0xc4, 0x39,
    0x84, 0x1e, 0x72, 0xa5, 0x3b, 0xf0, 0xc9, 0x58,
    0x27, 0xb3, 0x6e, 0x9a, 0x41, 0xd8, 0x05, 0xf2
]

// Obfuscation/de-obfuscation functions
private func obfuscate(_ input: String) -> [UInt8] {
    let bytes = [UInt8](input.utf8)
    return bytes.enumerated().map { offset, element in
        element ^ salt[offset % salt.count]
    }
}

private func deobfuscate(_ encoded: [UInt8]) -> String {
    String(decoding: encoded.enumerated().map { offset, element in
        element ^ salt[offset % salt.count]
    }, as: UTF8.self)
}

@dynamicMemberLookup
struct EnvContainer {
    let vars: [String: [UInt8]]
    
    // Maintain the same API surface
    subscript(dynamicMember member: String) -> String {
        if let encoded = vars[member] {
            return deobfuscate(encoded)
        }
        return ""
    }
}

func loadENV(map: [String: String], showLogs: Bool = true) -> EnvContainer {
    var out: [String: [UInt8]] = [:]
    var missing: [String] = []
    for (varName, plistKey) in map {
        let value = Bundle.main.object(forInfoDictionaryKey: plistKey)
        if let string = value as? String {
            // Only show first 3 chars in logs for security
            if showLogs { 
                let maskedValue = string.count > 3 ? String(string.prefix(3)) + "..." : "..."
                print("✅ ENV: \(varName) (\(plistKey)) = \(maskedValue)") 
            }
            // Store obfuscated value instead of plain text
            out[varName] = obfuscate(string)
        } else if let actual = value {
            if showLogs { print("⚠️ ENV WARNING: \(varName) (\(plistKey)) found, but value is not String. Received: \(actual) (\(type(of: actual)))") }
        } else {
            if showLogs { print("⚠️ ENV WARNING: \(varName) (\(plistKey)) missing in Info.plist.") }
            missing.append(varName)
        }
    }
    if missing.isEmpty && showLogs {
        print("✅ All ENV variables loaded successfully.")
    }
    return EnvContainer(vars: out)
}

// Production use
let ENV = loadENV(map: ENVMap, showLogs: true)

// For testing: (no reason to duplicate - reuse code as needed)
let ENVTest = loadENV(map: ENVMap, showLogs: false)

// USAGE: ENV.supabaseUrl, ENV.supabasePublishableKey, etc.
