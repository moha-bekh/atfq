use std::env;
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    let proto_file = "proto/user/user.proto";

    tonic_build::configure()
        .build_server(true)
        .file_descriptor_set_path(out_dir.join("user_descriptor.bin"))
        .compile(&[proto_file], &["proto"])?;
    Ok(())
}
