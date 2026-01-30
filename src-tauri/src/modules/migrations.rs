use rusqlite::{Connection, Error, Transaction};

use crate::modules::utils;

pub fn get_latest_version() -> u32 {
    UPGRADES.len() as u32
}

pub fn migrate_to_latest(current: u32, conn: &mut Connection) -> Result<(), String> {
    for (i, upgrade) in UPGRADES.iter().enumerate() {
        let iter_ver = i as u32 + 1;

        if current < iter_ver {
            let mut tx = conn.transaction().map_err(|e| utils::treat(e, "Unable to begin transaction"))?;

            upgrade(&mut tx)?;
            tx.commit().map_err(|e| utils::treat(e, "Unable to commit transaction"))?;

            conn.execute(&format!("PRAGMA user_version = {}", iter_ver), []).map_err(upgrade_error)?;
        }
    }

    Ok(())
}

pub fn label_latest(conn: Connection) -> Result<(), String> {
    conn.execute(&format!("PRAGMA user_version = {}", UPGRADES.len()), []).map_err(upgrade_error)?;
    Ok(())
}

fn upgrade_error(e: Error) -> String {
    utils::treat(e, "Unable to upgrade library")
}

static UPGRADES: &[fn(&mut Transaction) -> Result<(), String>] = &[
    // |tx| {
    //     log::info!("Migrating library to v1");
    //     Ok(())
    // }
];