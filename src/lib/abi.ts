export const SEISMIC_DISCORD_STAT_ABI = [
    {
        inputs: [
            { name: "uri", type: "string" },
            { name: "art", type: "suint256" },
            { name: "tweet", type: "suint256" },
            { name: "chat", type: "suint256" },
            { name: "role", type: "suint256" },
        ],
        name: "mint",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;

