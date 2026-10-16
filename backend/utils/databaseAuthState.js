/**
 * Database-backed Auth State for Baileys
 * Persists WhatsApp session data in PostgreSQL instead of filesystem
 * Works on ephemeral filesystems like Render, Heroku, etc.
 */

const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');
const { pool } = require('../config/db');

/**
 * Serialize data with Buffer support
 */
function serializeData(data) {
    return JSON.parse(JSON.stringify(data, BufferJSON.replacer));
}

/**
 * Deserialize data with Buffer support
 */
function deserializeData(data) {
    if (typeof data === 'string') {
        return JSON.parse(data, BufferJSON.reviver);
    }
    // If already object, convert to string then parse with reviver to handle Buffers
    const jsonString = JSON.stringify(data);
    return JSON.parse(jsonString, BufferJSON.reviver);
}

/**
 * Create database-backed auth state
 * @param {string} instanceName - WhatsApp instance name
 */
async function useDatabaseAuthState(instanceName) {
    console.log(`🔑 Loading auth state for: ${instanceName}`);
    
    let creds;
    let keys = {};

    try {
        // Load existing session from database
        const result = await pool.query(
            'SELECT session_data FROM wa_instances WHERE instance_name = $1',
            [instanceName]
        );

        if (result.rows.length > 0 && result.rows[0].session_data) {
            console.log(`📦 Found existing session data for ${instanceName}`);
            
            const sessionData = result.rows[0].session_data;
            
            try {
                const deserialized = deserializeData(sessionData);
                creds = deserialized.creds || initAuthCreds();
                keys = deserialized.keys || {};
                
                const keyCount = Object.keys(keys).length;
                console.log(`✅ Session loaded successfully for ${instanceName} (${keyCount} keys)`);
                
                // If session has 0 keys, it's corrupted - clear it
                if (keyCount === 0 && deserialized.creds) {
                    console.log(`⚠️  Session has 0 keys - likely corrupted, will generate fresh QR`);
                    // Clear the corrupted session
                    await pool.query(
                        `UPDATE wa_instances 
                         SET session_data = NULL, 
                             status = 'disconnected',
                             qr_code = NULL,
                             phone_number = NULL,
                             updated_at = CURRENT_TIMESTAMP 
                         WHERE instance_name = $1`,
                        [instanceName]
                    );
                    console.log(`🧹 Cleared corrupted session for ${instanceName}`);
                    // Use fresh credentials
                    creds = initAuthCreds();
                    keys = {};
                }
            } catch (parseError) {
                console.error(`❌ Error parsing session data:`, parseError.message);
                console.log(`🆕 Creating fresh credentials for ${instanceName}`);
                creds = initAuthCreds();
                keys = {};
            }
        } else {
            console.log(`🆕 No existing session, creating new credentials for ${instanceName}`);
            creds = initAuthCreds();
            keys = {};
        }
    } catch (error) {
        console.error(`❌ Error loading session for ${instanceName}:`, error.message);
        console.error('Stack:', error.stack);
        creds = initAuthCreds();
        keys = {};
    }

    /**
     * Save credentials to database
     */
    const saveCreds = async () => {
        try {
            const sessionData = {
                creds,
                keys
            };

            // Serialize with Buffer support
            const serialized = serializeData(sessionData);
            
            await pool.query(
                `UPDATE wa_instances 
                 SET session_data = $1, updated_at = CURRENT_TIMESTAMP 
                 WHERE instance_name = $2`,
                [serialized, instanceName]
            );
            
            console.log(`💾 Session saved for ${instanceName} (${Object.keys(keys).length} keys)`);
        } catch (error) {
            console.error(`❌ Error saving session for ${instanceName}:`, error.message);
            console.error('Stack:', error.stack);
        }
    };

    return {
        state: {
            creds,
            keys: {
                get: (type, ids) => {
                    const data = {};
                    try {
                        for (const id of ids) {
                            let value = keys[`${type}-${id}`];
                            if (value) {
                                if (type === 'app-state-sync-key') {
                                    value = proto.Message.AppStateSyncKeyData.fromObject(value);
                                }
                                data[id] = value;
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Error getting keys (${type}):`, error.message);
                    }
                    return data;
                },
                set: (data) => {
                    try {
                        let updated = false;
                        let keysAdded = 0;
                        
                        for (const category in data) {
                            for (const id in data[category]) {
                                const value = data[category][id];
                                const key = `${category}-${id}`;
                                if (value) {
                                    keys[key] = value;
                                    updated = true;
                                    keysAdded++;
                                } else {
                                    delete keys[key];
                                }
                            }
                        }
                        
                        if (updated) {
                            const totalKeys = Object.keys(keys).length;
                            console.log(`🔑 Keys updated: +${keysAdded} new, ${totalKeys} total`);
                            
                            // Only save if we have meaningful keys (not just empty state)
                            if (totalKeys > 0) {
                                // Save asynchronously (don't block)
                                saveCreds().catch(err => {
                                    console.error(`❌ Error in async saveCreds:`, err.message);
                                });
                            } else {
                                console.log(`⏭️  Skipping save - no keys yet`);
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Error setting keys:`, error.message);
                    }
                }
            }
        },
        saveCreds
    };
}

module.exports = { useDatabaseAuthState };
