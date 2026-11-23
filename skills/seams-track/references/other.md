# Tracker: anything else

For Linear, Jira, a spreadsheet, a TODO list, or anything without its own file here, work out these
answers from the tool's CLI or API, and write them into a short note that you give workers in place
of a tracker file:

- **Find:** how to search for an existing item before creating one.
- **Read:** how a worker reads its unit, its parent, and its dependencies.
- **Tier:** where a unit's tier is recorded, if anywhere.
- **Progress and decisions:** where a worker records them.
- **Open question:** how a worker marks that an item waits on the operator, so the router can find
  it.
- **Backlog item:** how to file an out-of-scope finding linked to the root.
- **Commit trailer:** the line that links a commit to its unit.
- **Cannot finish:** how a worker marks a unit as stopped.
- **Done:** how an item closes, and where the evidence goes.
- **Planning:** how the planner creates units with a parent, blockers, and a tier.
- **Working alone:** how an agent on a direct request creates, updates, and closes its own item.
- **Router only:** what marks a unit in progress and done, and where the integration branch is
  recorded.

If you cannot read or update the tracker from the shell, ask the operator how they want progress
recorded before dispatching or creating anything.
