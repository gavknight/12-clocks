// Bedrock Edition entry — set flag before anything else loads
(window as unknown as Record<string, unknown>).__BEDROCK__ = true;

// Then run the exact same game
import "./main";
