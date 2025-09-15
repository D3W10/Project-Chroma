use log;

pub fn treat<E: std::fmt::Display>(e: E, msg: &str) -> String {
    log::error!("{}: {}", msg, e);
    msg.to_string()
}