import db from "@repo/db/client";
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt";

export const authOptions = {
    providers: [
      CredentialsProvider({
          name: 'Credentials',
          credentials: {
            phone: { label: "Phone number", type: "text", placeholder: "1231231231", required: true },
            password: { label: "Password", type: "password", required: true }
          },
          // TODO: User credentials type from next-aut
          async authorize(credentials: Record<"password" | "phone", string> | undefined) {
            // Do zod validation, OTP validation here
            if(credentials === undefined){
                return null;
            }
            const hashedPassword = await bcrypt.hash(credentials.password, 10);
            const existingUser = await db.user.findFirst({
                where: {
                    number: credentials.phone
                }
            });

            if (existingUser) {
                const passwordValidation = await bcrypt.compare(credentials.password, existingUser.password);
                if (passwordValidation) {
                    return {
                        id: existingUser.id.toString(),
                        name: existingUser.name,
                        email: existingUser.number
                    }
                }
                return null;
            }

            try {
                // after creating a user we need to initialize the balance to zero simultaneously so I used the concept of transactions 
                 const res = await db.$transaction(async (tx) => {
                    const user = await tx.user.create({
                      data: {
                        number: credentials.phone,
                        password: hashedPassword
                      }
                    });
                  
                    await tx.balance.create({
                      data: {
                        userId: user.id,
                        amount: 0,
                        locked: 0
                      }
                    });
                  
                    return user;
                  });
                  
                return {
                    id: res?.id.toString(),
                    name: res?.name,
                    email: res?.number
                }
            } catch(e) {
                console.error(e);
            }

            return null
          },
        })
    ],
    secret: process.env.JWT_SECRET || "secret",
    callbacks: {
        // TODO: can u fix the type here? Using any is bad
        async session({ token, session }: any) {
            session.user.id = token.sub

            return session
        }
    }
  }
  