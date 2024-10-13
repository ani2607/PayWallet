import express from "express";
import db from "@repo/db/client";

const app = express();

app.use(express.json())
interface PaymentInfo {
    token : string,
    userId : string,
    amount : string
}

app.post("/hdfcWebhook", async (req, res) => {
    //TODO: Add zod validation here?
    //TODO: HDFC bank should ideally send us a secret so we know this is sent by them
    const paymentInformation: PaymentInfo = {
        token: req.body.token,
        userId: req.body.user_identifier,
        amount: req.body.amount
    };
    // console.log(paymentInformation);

    const pay = await db.onRampTransaction.findFirst({
        where: {
            token: paymentInformation.token
        }
    })
    // console.log(pay);
    // use to verify if the payment is already processed or not 
    if(pay?.status !== "Processing" ) {
         res.status(409).json({
            message: "Already processed"
        })
        return ;
    }
    
    try {
        await db.$transaction([
            db.balance.update({
                where: {
                    userId: Number(paymentInformation.userId)
                },
                data: {
                    amount: {
                        // You can also get this from your DB
                        increment: Number(paymentInformation.amount)
                    }
                }
            }),
            db.onRampTransaction.update({
                where: {
                    token: paymentInformation.token
                }, 
                data: {
                    status: "Success",
                }
            })
        ]);

        const d = await db.balance.findFirst({
            where:{
                userId : Number(paymentInformation.userId)
            }
        })

        console.log(d);

        res.json({
            message: "Captured"
        })
    } catch(e) {
        console.error(e);
        res.status(411).json({
            message: "Error while processing webhook"
        })
    }

})

app.listen(3003);