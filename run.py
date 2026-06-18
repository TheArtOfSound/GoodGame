import os
import sys

import uvicorn


def main() -> None:
    raw_port = os.environ.get("PORT") or "8080"
    try:
        port = int(raw_port)
    except ValueError:
        print(f"Invalid PORT value: {raw_port!r}", file=sys.stderr, flush=True)
        raise

    print(f"Starting GoodGame on 0.0.0.0:{port}", flush=True)
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info", access_log=True)


if __name__ == "__main__":
    main()
