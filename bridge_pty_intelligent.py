import os, pty, subprocess, select, asyncio, uvicorn
from fastapi import FastAPI, WebSocket
app = FastAPI()
@app.websocket("/ws/terminal")
async def terminal_websocket(websocket: WebSocket):
    await websocket.accept()
    m_fd, s_fd = pty.openpty()
    proc = subprocess.Popen(["/bin/bash"], preexec_fn=os.setsid, stdin=s_fd, stdout=s_fd, stderr=s_fd, universal_newlines=True)
    async def r():
        while True:
            await asyncio.sleep(0.01)
            if select.select([m_fd], [], [], 0)[0]:
                try: await websocket.send_text(os.read(m_fd, 1024).decode())
                except: break
    async def w():
        while True:
            try: os.write(m_fd, (await websocket.receive_text()).encode())
            except: break
    try: await asyncio.gather(r(), w())
    finally:
        os.close(m_fd); os.close(s_fd); proc.terminate()
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
