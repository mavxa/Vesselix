use std::{env, fs, io, path::Path};

fn main() {
    println!("cargo:rerun-if-changed=../dist");

    let out_dir = env::var("OUT_DIR").expect("OUT_DIR is set by cargo");
    let embed_dir = Path::new(&out_dir).join("frontend");
    let source_dir = Path::new("../dist");

    if embed_dir.exists() {
        fs::remove_dir_all(&embed_dir).expect("remove previous embedded frontend");
    }
    fs::create_dir_all(&embed_dir).expect("create embedded frontend dir");

    if source_dir.exists() {
        copy_dir(source_dir, &embed_dir).expect("copy frontend dist into embedded assets");
    } else {
        fs::write(
            embed_dir.join("index.html"),
            "<!doctype html><title>Vesselix</title><body>Vesselix frontend was not built.</body>",
        )
        .expect("write fallback frontend placeholder");
    }
}

fn copy_dir(from: &Path, to: &Path) -> io::Result<()> {
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let source = entry.path();
        let target = to.join(entry.file_name());
        if source.is_dir() {
            fs::create_dir_all(&target)?;
            copy_dir(&source, &target)?;
        } else {
            fs::copy(&source, &target)?;
        }
    }
    Ok(())
}
