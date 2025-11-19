from pi_app import create_app

app = create_app()

if __name__ == "__main__":
    from pi_app.config import settings
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.auto_reload,
    )

