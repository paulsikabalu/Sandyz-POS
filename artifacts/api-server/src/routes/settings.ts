import { Router } from "express";
import { db } from "../data/store";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

interface SettingsParams {
  [key: string]: string;
  key: string;
}

/**
 * GET /api/settings
 * Returns all application settings.
 */
router.get("/", (_req, res) => {
  try {
    const settings = db.getSettings();

    const settingsMap: Record<string, string> = {};

    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    res.json(settingsMap);

  } catch (error) {
    console.error("GET /settings failed:", error);
    res.status(500).json({
      error: "Failed to load settings"
    });
  }
});


/**
 * GET /api/settings/:key
 * Returns a single setting value.
 */
router.get<SettingsParams>("/:key", (req, res) => {
  try {
    const key = req.params.key;

    const setting = db.getSetting(key);

    if (!setting) {
      return res.status(404).json({
        error: "Setting not found"
      });
    }

    res.json({
      key: setting.key,
      value: setting.value
    });

  } catch (error) {
    console.error("GET /settings/:key failed:", error);

    res.status(500).json({
      error: "Failed to load setting"
    });
  }
});


/**
 * PUT /api/settings/:key
 * Updates or creates a setting.
 * Requires admin or manager role.
 */
router.put<SettingsParams>(
  "/:key",
  authorize("admin", "manager"),
  (req, res) => {
    try {
      const key = req.params.key;

      const { value } = req.body as {
        value?: string;
      };


      if (value === undefined || value === null) {
        return res.status(400).json({
          error: "Value is required"
        });
      }


      const updated = db.upsertSetting(
        key,
        String(value)
      );


      res.json({
        key: updated.key,
        value: updated.value
      });


    } catch (error) {
      console.error("PUT /settings/:key failed:", error);

      res.status(500).json({
        error: "Failed to update setting"
      });
    }
  }
);


export default router;