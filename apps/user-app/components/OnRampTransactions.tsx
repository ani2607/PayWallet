import { Card } from "@repo/ui/card"

interface OnRampTransactionsProps {
    transactions: {
        time: Date,
        amount: number,
        // TODO: Can the type of `status` be more specific?
        status: string,
        provider: string
    }[]
}

export const OnRampTransactions = ({
    transactions
}: OnRampTransactionsProps
) => {
    if (!transactions.length) {
        return <Card title="Recent Transactions">
            <div className="text-center pb-8 pt-8">
                No Recent transactions
            </div>
        </Card>
    }
    return <Card title="Recent Transactions">
        <div className="pt-2">
            {transactions.map(t => <div className="flex justify-between p-1">
                <div>
                    <div className="text-sm">
                        Received INR
                    </div>
                    <div className="text-slate-600 text-xs">
                        {t.time.toDateString()}
                    </div>
                </div>
                <div className={`flex flex-col justify-center ${t.status === "Success" ? "text-green-500" : "text-red-500"} `}>
                    + Rs {t.amount / 100}
                </div>

            </div>)}
        </div>
    </Card>
}