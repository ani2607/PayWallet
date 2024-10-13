"use server"
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import prisma from "@repo/db/client";


export async function p2pTranser(to:string,amount:number) {

    const session = await getServerSession(authOptions);
    if(!session || !session.user || !session.user.id) {
        return {
            message: "Unauthenticated request"
        }
    }

    const fromUser = Number(session?.user?.id);
    const toUser = await prisma.user.findFirst({
        where:{
            number : to
        }
    })

    if(!toUser){
        return {
            message : "User Not found"
        }
    }

    // this logic first checks if the user has enough balance and then updates the balances of the two users using transaction concept

    // But this is not correct as the user could send multiple requests at the same time and they would fetch the same balance as the first request

    // The solution is to use the concept of locking the database where the requests locks the row of a user and makes sure that no other request could fetch the same row

    // This is much better than using a queuing approach as we could parallely accept request of different users but for same user request we only would  resolved sequentially   

    // In postgres, a transaction ensure that either all the statements happen or none. It does not lock rows/ revert a transaction if something from this transaction got updated before the transaction committed (unlike MongoDB which reverts the transaction if something got updated before the transaction committed)


    try {
        await prisma.$transaction(async (tx) => {
            // locking in prisma 
            // this could also be done by typedQuery feature in prisma
            await tx.$queryRaw`SELECT * FROM "Balance" WHERE "userId" = ${Number(fromUser)} FOR UPDATE`;
    
            const fromBalance = await tx.balance.findFirst({
                where: {
                    userId: fromUser
                }
            })
            if(!fromBalance || fromBalance.amount < amount) {
                return {
                    message: "Insufficient Balance"
                }
            }
             await tx.balance.update({
                where: {
                    userId: Number(fromUser)
                },
                data: {
                    amount: {
                        decrement: amount
                    }
                }
            })
             await tx.balance.update({
                where: {
                    userId: Number(toUser.id)
                },
                data: {
                    amount: {
                        increment: amount
                    }
                }
            })
            // makes a entry in p2p transfer
            await tx.p2pTransfer.create({
                data:{
                    fromUserId: fromUser,
                    toUserId: toUser.id,
                    amount: amount,
                    timestamp: new Date()
                }
            })
            return {
                message: "Done"
            }
        })
    } catch (error) {
        console.log(error);
        
        return {
            message: "Something went wrong"
        }
    }


  

}