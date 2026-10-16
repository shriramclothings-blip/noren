/**
 * Database-backed Auth State for Baileys
 * Persists WhatsApp session data in PostgreSQL instead of filesystem
 * Works on ephemeral filesystems like Render, Heroku, etc.
 */

const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');
const { pool } = require('../config/db');

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
            
            // Parse with BufferJSON reviver if it's a string
            if (typeof sessionData === 'string') {
                const parsed = JSON.parse(sessionData, BufferJSON.reviver);
                creds = parsed.creds || initAuthCreds();
                keys = parsed.keys || {};
            } else {
                // Already parsed JSONB
                creds = sessionData.creds || initAuthCreds();
                keys = sessionData.keys || {};
            }
            
            console.log(`✅ Session loaded successfully for ${instanceName}`);
        } else {
            console.log(`🆕 No existing session, creating new credentials for ${instanceName}`);
            // Initialize new credentials
            creds = initAuthCreds();
            keys = {};
        }
    } catch (error) {
        console.error(`❌ Error loading session for ${instanceName}:`, error.message);
        // Fallback to new credentials
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

            const jsonString = JSON.stringify(sessionData, BufferJSON.replacer);
            
            await pool.query(
                `UPDATE wa_instances 
                 SET session_data = $1, updated_at = CURRENT_TIMESTAMP 
                 WHERE instance_name = $2`,
                [jsonString, instanceName]
            );
            
            console.log(`💾 Session saved for ${instanceName}`);
        } catch (error) {
            console.error(`❌ Error saving session for ${instanceName}:`, error.message);
            throw error;
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
                        for (const category in data) {
                            for (const id in data[category]) {
                                const value = data[category][id];
                                const key = `${category}-${id}`;
                                if (value) {
                                    keys[key] = value;
                                } else {
                                    delete keys[key];
                                }
                            }
                        }
                        // Save asynchronously (don't block)
                        saveCreds().catch(err => {
                            console.error(`❌ Error in async saveCreds:`, err.message);
                        });
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
