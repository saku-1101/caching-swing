import { assertNonNullable } from "@/libs/assert";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

type Data = {
  randomNumber: number;
};

export async function GET(req: NextRequest, res: NextResponse<Data>) {
  try {
    // generate number between 0 and 100
    const randomNumber = Math.random() * 100;
    return NextResponse.json({ randomNumber }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}
