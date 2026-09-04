const MAX_INPUT_BYTES = 20_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

function toFullWidth(text) {
  let output = "";

  for (const character of text) {
    const codePoint = character.codePointAt(0);

    if (codePoint === 0x20) {
      output += "\u3000";
    } else if (codePoint >= 0x21 && codePoint <= 0x7e) {
      output += String.fromCodePoint(codePoint + 0xfee0);
    } else {
      output += character;
    }
  }

  return output;
}

async function readInput(request) {
  if (request.method === "GET") {
    return new URL(request.url).searchParams.get("text");
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    let body;

    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, "INVALID_JSON", "JSONの形式が正しくありません。");
    }

    if (
      body === null ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      typeof body.text !== "string"
    ) {
      throw new ApiError(
        400,
        "INVALID_TEXT",
        'リクエスト本文に文字列の "text" を指定してください。'
      );
    }

    return body.text;
  }

  if (contentType.includes("text/plain")) {
    return request.text();
  }

  throw new ApiError(
    415,
    "UNSUPPORTED_MEDIA_TYPE",
    "Content-Type は application/json または text/plain を使用してください。"
  );
}

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return json(
      {
        success: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "GET または POST を使用してください。",
        },
      },
      405,
      { Allow: "GET, POST, OPTIONS" }
    );
  }

  try {
    const text = await readInput(request);

    if (text === null) {
      throw new ApiError(
        400,
        "MISSING_TEXT",
        'クエリパラメータ "text" を指定してください。'
      );
    }

    const inputBytes = new TextEncoder().encode(text).byteLength;

    if (inputBytes > MAX_INPUT_BYTES) {
      throw new ApiError(
        413,
        "TEXT_TOO_LARGE",
        `入力は ${MAX_INPUT_BYTES} バイト以下にしてください。`
      );
    }

    const result = toFullWidth(text);

    return json({
      success: true,
      result,
      input: {
        characters: Array.from(text).length,
        bytes: inputBytes,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return json(
        {
          success: false,
          error: { code: error.code, message: error.message },
        },
        error.status
      );
    }

    console.error("Unexpected conversion API error", error);

    return json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "変換処理中にエラーが発生しました。",
        },
      },
      500
    );
  }
}
