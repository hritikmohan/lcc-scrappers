import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the current directory path in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const saveNewUserKey = async (req, res) => {
    const file = "[ saveNewUserKey ]"

  try {
    const { userKey } = req.body;

    // Validate that userKey exists in the request body
    if (!userKey) {
        console.log(file, "User key not received")
      return res.status(400).json({
        success: false,
        message: "userKey is required in the request body",
      });
    }

    // Define the file path
    const filePath = path.join(__dirname, "../../", "constants", "indigo-user-key.json");

    // Create data directory if it doesn't exist
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Prepare the data to be saved
    const dataToSave = {
      userKey,
      createdAt: new Date().toISOString(),
    };

    // Write to the JSON file
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));

    return res.status(200).json({
      success: true,
      message: "User key saved successfully",
      data: dataToSave,
    });
  } catch (error) {
    console.error(file, "Error saving user key:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while saving user key",
      error: error.message,
    });
  }
};
