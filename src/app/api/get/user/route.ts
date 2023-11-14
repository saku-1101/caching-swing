import { assertNonNullable } from "@/libs/assert";
import { User } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";

export async function GET( req: NextRequest,
  res: NextResponse<User>) {
    try{
      const user = await prisma.user.findUnique({
        where: { id: 1 },
      });
      assertNonNullable(user);
    return NextResponse.json({...user}, {status: 200})
    }catch{
      return NextResponse.json({message: "error"}, {status: 500})
    }
}