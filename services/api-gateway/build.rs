fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::configure()
        .build_server(false)
        .compile_protos(
            &[
                "proto/auth/v1/auth.proto",
                "proto/user/user.proto",
                "proto/wiki/v1/wiki.proto",
            ],
            &["proto"],
        )?;

    Ok(())
}
