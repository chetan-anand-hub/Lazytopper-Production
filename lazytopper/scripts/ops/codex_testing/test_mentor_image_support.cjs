const assert = require("assert");
const path = require("path");

const {
  buildGeminiImagePart,
  validateMentorImagePayload,
} = require(path.join(__dirname, "..", "..", "..", "server", "mentorImageSupport.cjs"));

const ONE_BY_ONE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0pR1sAAAAASUVORK5CYII=";

function expectFail(payload, expectedMessage) {
  const result = validateMentorImagePayload(payload);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error, expectedMessage);
}

try {
  assert.deepStrictEqual(validateMentorImagePayload({}), {
    ok: false,
    error: "NO_IMAGE",
  });

  expectFail(
    {
      imageBase64: ONE_BY_ONE_PNG_BASE64,
      imageMimeType: "image/gif",
    },
    "Only JPG and PNG images are allowed."
  );

  expectFail(
    {
      imageBase64: `data:image/png;base64,${ONE_BY_ONE_PNG_BASE64}`,
      imageMimeType: "image/png",
    },
    "Send raw base64 only, without a data URL prefix."
  );

  expectFail(
    {
      imageBase64: "   ",
      imageMimeType: "image/png",
    },
    "Image data is empty."
  );

  const hugeBase64 = "AAAA".repeat(Math.ceil((3 * 1024 * 1024) / 3) + 16);
  expectFail(
    {
      imageBase64: hugeBase64,
      imageMimeType: "image/png",
    },
    "Image is too large. Max size is 3 MB."
  );

  expectFail(
    {
      imageBase64: "not@@base64",
      imageMimeType: "image/png",
    },
    "Image base64 is malformed."
  );

  const valid = validateMentorImagePayload({
    imageBase64: ONE_BY_ONE_PNG_BASE64,
    imageMimeType: "image/png",
    imageName: "tiny.png",
  });
  assert.strictEqual(valid.ok, true);
  assert.strictEqual(valid.mimeType, "image/png");
  assert.strictEqual(valid.base64, ONE_BY_ONE_PNG_BASE64);

  const part = buildGeminiImagePart({
    mimeType: "image/png",
    base64: ONE_BY_ONE_PNG_BASE64,
  });
  assert.deepStrictEqual(part, {
    inline_data: {
      mime_type: "image/png",
      data: ONE_BY_ONE_PNG_BASE64,
    },
  });

  console.log("mentor_image_support_test: PASS");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
