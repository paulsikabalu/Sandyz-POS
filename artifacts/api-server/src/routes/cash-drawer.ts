import { Router } from "express";
import net from "net";

const router = Router();

/**
 * POST /cash-drawer/open
 * Opens a cash drawer by sending an ESC/POS kick command over a raw TCP
 * socket to the receipt printer (which has the drawer connected via RJ-11).
 */
router.post("/open", async (req, res) => {
  const { ip, port = 9100, pin = 0 } = req.body as {
    ip: string;
    port?: number;
    pin?: 0 | 1;
  };

  if (!ip) {
    res.status(400).json({ message: "Cash drawer IP address is required" });
    return;
  }

  const pinByte = pin === 1 ? 1 : 0;

  try {
    await openDrawerSocket(ip, Number(port), pinByte as 0 | 1);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(502).json({ message: err?.message ?? "Failed to open cash drawer" });
  }
});

function openDrawerSocket(ip: string, port: number, pin: 0 | 1): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    // ESC p m t1 t2 — kick cash drawer pin
    // m = pin (0 = pin 2, 1 = pin 5), t1 = on-time ×2ms, t2 = off-time ×2ms
    const ESC_POS = Buffer.from([0x1b, 0x70, pin, 25, 250]);

    socket.setTimeout(3000);

    socket.connect(port, ip, () => {
      socket.write(ESC_POS, () => {
        socket.end();
        resolve();
      });
    });

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error(`Connection to ${ip}:${port} timed out`));
    });

    socket.on("error", (err) => {
      reject(err);
    });
  });
}

export default router;
