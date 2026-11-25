/* This standalone playtest never calls the production weekly feed. */
window.StackWeekly=Object.freeze({entries:Object.freeze([]),load:async()=>[],refresh:async()=>[],puzzle:()=>{throw Error("No weekly puzzles in playtest")},spec:()=>{throw Error("No weekly puzzles in playtest")}});
