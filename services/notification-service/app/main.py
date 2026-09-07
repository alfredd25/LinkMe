from fastapi import FastAPI

app = FastAPI(title="Notification Service", version="1.0.0")


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
