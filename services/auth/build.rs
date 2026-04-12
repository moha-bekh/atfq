use std::env;
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {

    let out_dir = PathBuf::from(env::var("OUT_DIR").expect("expect OUT_DIR env variable"));

    tonic_build::configure()
        .file_descriptor_set_path(out_dir.join("auth_descriptor.bin"))
        .compile(
            &["proto/auth/v1/auth.proto"],
            &["proto"],
        )?;

    Ok(())
}

