
import { useEffect, useState } from "react";
import {
  BrowserProvider,
  Contract,
  formatEther,
  parseEther,
  isAddress,
  getAddress,
} from "ethers";
import { CONTRACT_ADDRESS, ABI } from "./contract";

const CHAIN_ID = 1337;

export default function App() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [contract, setContract] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [freelancer, setFreelancer] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const [projectId, setProjectId] = useState("");
  const [milestoneId, setMilestoneId] = useState("0");

  // Update wallet balance
  async function updateBalance(address) {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const balanceWei = await provider.getBalance(address);
      setBalance(formatEther(balanceWei));
    } catch (error) {
      console.error("Balance error:", error);
    }
  }

  // Load all projects
  async function loadProjects(activeContract) {
    try {
      const count = await activeContract.projectCount();
      const loadedProjects = [];

      for (let i = 1; i <= Number(count); i++) {
        try {
          const data = await activeContract.getProject(i);
          const milestoneCount =
            await activeContract.getMilestoneCount(i);

          loadedProjects.push({
            id: i,
            client: data.client,
            freelancer: data.freelancer,
            title: data.title,
            totalAmount: formatEther(data.totalAmount),
            completed: data.completed,
            milestoneCount: Number(milestoneCount),
          });
        } catch (error) {
          console.error(`Project ${i} loading error:`, error);
        }
      }

      setProjects(loadedProjects);
    } catch (error) {
      console.error("Loading projects error:", error);
      setMessage("Unable to load projects. Check your network.");
    }
  }

  // Connect MetaMask
  async function connectWallet() {
    try {
      if (!window.ethereum) {
        setMessage("MetaMask is not installed.");
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      if (!accounts.length) {
        setMessage("No wallet account found.");
        return;
      }

      const network = await provider.getNetwork();

      if (Number(network.chainId) !== CHAIN_ID) {
        setMessage(
          "Please switch MetaMask to Ganache Local (Chain ID 1337)."
        );
        return;
      }

      const signer = await provider.getSigner();
      const activeAccount = await signer.getAddress();

      const activeContract = new Contract(
        CONTRACT_ADDRESS,
        ABI,
        signer
      );

      setAccount(activeAccount);
      setContract(activeContract);

      setMessage("Wallet connected successfully!");

      await updateBalance(activeAccount);
      await loadProjects(activeContract);
    } catch (error) {
      console.error("Wallet connection error:", error);
      setMessage(
        error.shortMessage || error.message || "Failed to connect wallet."
      );
    }
  }

  // Create project and fund escrow
  async function createProject(event) {
    event.preventDefault();

    try {
      if (!contract) {
        setMessage("Connect your wallet first.");
        return;
      }

      const freelancerAddress = freelancer.trim();
      const projectTitle = title.trim();
      const milestoneDescription = description.trim();

      if (
        !freelancerAddress ||
        !projectTitle ||
        !milestoneDescription ||
        !amount
      ) {
        setMessage("Please fill in all project details.");
        return;
      }

      // Validate freelancer address
      if (!isAddress(freelancerAddress)) {
        setMessage(
          "Invalid wallet address. Enter a valid Ethereum address."
        );
        return;
      }

      // Convert address into checksum format
      const validFreelancerAddress = getAddress(freelancerAddress);

      // Client and freelancer cannot be the same
      if (
        validFreelancerAddress.toLowerCase() ===
        account.toLowerCase()
      ) {
        setMessage(
          "Client and freelancer must use different wallet addresses."
        );
        return;
      }

      // Validate amount
      if (
        !Number.isFinite(Number(amount)) ||
        Number(amount) <= 0
      ) {
        setMessage("Enter a valid amount greater than zero.");
        return;
      }

      setLoading(true);
      setMessage("Preparing transaction...");

      const value = parseEther(amount);

      console.log("Client:", account);
      console.log("Freelancer:", validFreelancerAddress);
      console.log("Contract:", CONTRACT_ADDRESS);
      console.log("Amount:", amount);

      const tx = await contract.createProject(
        validFreelancerAddress,
        projectTitle,
        [milestoneDescription],
        [value],
        { value: value }
      );

      setMessage("Transaction submitted. Waiting for confirmation...");

      await tx.wait();

      setMessage("Project created successfully!");

      setFreelancer("");
      setTitle("");
      setDescription("");
      setAmount("");

      await loadProjects(contract);
      await updateBalance(account);
    } catch (error) {
      console.error("Create project error:", error);

      setMessage(
        error.reason ||
          error.shortMessage ||
          error.message ||
          "Transaction failed."
      );
    } finally {
      setLoading(false);
    }
  }

  // Submit milestone
  async function submitMilestone(event) {
    event.preventDefault();

    try {
      if (!contract) {
        setMessage("Connect your wallet first.");
        return;
      }

      if (projectId === "" || milestoneId === "") {
        setMessage("Enter project and milestone IDs.");
        return;
      }

      setLoading(true);
      setMessage("Submitting milestone...");

      const tx = await contract.submitMilestone(
        Number(projectId),
        Number(milestoneId)
      );

      await tx.wait();

      setMessage("Milestone submitted successfully!");

      await loadProjects(contract);
    } catch (error) {
      console.error("Submit milestone error:", error);

      setMessage(
        error.reason ||
          error.shortMessage ||
          error.message ||
          "Milestone submission failed."
      );
    } finally {
      setLoading(false);
    }
  }

  // Approve milestone and release payment
  async function approveMilestone(event) {
    event.preventDefault();

    try {
      if (!contract) {
        setMessage("Connect your wallet first.");
        return;
      }

      if (projectId === "" || milestoneId === "") {
        setMessage("Enter project and milestone IDs.");
        return;
      }

      setLoading(true);
      setMessage("Approving milestone...");

      const tx = await contract.approveMilestone(
        Number(projectId),
        Number(milestoneId)
      );

      await tx.wait();

      setMessage("Milestone approved and payment released!");

      await loadProjects(contract);
      await updateBalance(account);
    } catch (error) {
      console.error("Approve milestone error:", error);

      setMessage(
        error.reason ||
          error.shortMessage ||
          error.message ||
          "Approval failed."
      );
    } finally {
      setLoading(false);
    }
  }

  // Handle MetaMask account switching
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (!accounts.length) {
        setAccount("");
        setContract(null);
        setProjects([]);
        setBalance("0");
        setMessage("Wallet disconnected.");
        return;
      }

      try {
        const provider = new BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();

        if (Number(network.chainId) !== CHAIN_ID) {
          setAccount("");
          setContract(null);
          setMessage("Please switch to Ganache Local.");
          return;
        }

        const signer = await provider.getSigner();
        const activeAccount = await signer.getAddress();

        const activeContract = new Contract(
          CONTRACT_ADDRESS,
          ABI,
          signer
        );

        setAccount(activeAccount);
        setContract(activeContract);

        await updateBalance(activeAccount);
        await loadProjects(activeContract);

        setMessage("Wallet account updated.");
      } catch (error) {
        console.error("Account change error:", error);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );
      window.ethereum.removeListener(
        "chainChanged",
        handleChainChanged
      );
    };
  }, []);

  // Shorten wallet address
  function shortenAddress(address) {
    if (!address) return "";
    return address.slice(0, 6) + "..." + address.slice(-4);
  }

  return (
    <div className="app">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Inter, Arial, sans-serif;
          background: #0b1120;
          color: #f8fafc;
        }

        button, input, textarea {
          font: inherit;
        }

        .app {
          min-height: 100vh;
          background:
            radial-gradient(circle at top right, #172554, transparent 35%),
            #0b1120;
        }

        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 22px 7%;
          border-bottom: 1px solid #1e293b;
          flex-wrap: wrap;
          gap: 15px;
        }

        .logo {
          font-size: 23px;
          font-weight: 800;
          color: #fff;
        }

        .logo span {
          color: #38bdf8;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .wallet-info {
          background: #172033;
          border: 1px solid #29364c;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          color: #cbd5e1;
        }

        .button {
          border: none;
          padding: 12px 18px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          transition: 0.2s;
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .primary {
          background: #38bdf8;
          color: #07111f;
        }

        .primary:hover {
          background: #7dd3fc;
        }

        .secondary {
          background: #263449;
          color: #e2e8f0;
        }

        .secondary:hover {
          background: #334155;
        }

        .green {
          background: #22c55e;
          color: #052e16;
        }

        .hero {
          padding: 65px 7% 40px;
          max-width: 1300px;
          margin: auto;
        }

        .hero h1 {
          font-size: clamp(35px, 5vw, 58px);
          margin: 0 0 18px;
          line-height: 1.1;
        }

        .hero h1 span {
          color: #38bdf8;
        }

        .hero p {
          max-width: 650px;
          line-height: 1.8;
          color: #94a3b8;
          font-size: 16px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          margin-top: 35px;
        }

        .stat {
          background: #121c2d;
          border: 1px solid #243247;
          padding: 22px;
          border-radius: 16px;
        }

        .stat h3 {
          font-size: 26px;
          margin: 0 0 8px;
          color: #38bdf8;
        }

        .stat p {
          margin: 0;
          font-size: 13px;
        }

        .main {
          max-width: 1300px;
          margin: auto;
          padding: 25px 7% 70px;
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 25px;
        }

        .panel {
          background: #121c2d;
          border: 1px solid #243247;
          border-radius: 18px;
          padding: 25px;
        }

        .panel h2 {
          margin: 0 0 22px;
          font-size: 21px;
        }

        .form-group {
          margin-bottom: 17px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          color: #cbd5e1;
          margin-bottom: 8px;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          background: #0b1120;
          border: 1px solid #334155;
          border-radius: 9px;
          padding: 12px;
          color: white;
          outline: none;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          border-color: #38bdf8;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 90px;
        }

        .full {
          width: 100%;
        }

        .message {
          margin-top: 16px;
          padding: 12px;
          border-radius: 9px;
          background: #172033;
          border: 1px solid #334155;
          color: #cbd5e1;
          font-size: 13px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .projects-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .projects-header h2 {
          margin: 0;
        }

        .project-list {
          display: grid;
          gap: 17px;
        }

        .project-card {
          background: #0b1120;
          border: 1px solid #27364b;
          border-radius: 14px;
          padding: 20px;
        }

        .project-card h3 {
          margin: 0 0 12px;
          font-size: 18px;
        }

        .project-card p {
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .project-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin: 16px 0;
        }

        .meta {
          background: #172033;
          padding: 12px;
          border-radius: 9px;
          font-size: 12px;
          color: #94a3b8;
          overflow-wrap: anywhere;
        }

        .meta strong {
          display: block;
          color: #e2e8f0;
          margin-top: 5px;
        }

        .status {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 12px;
          margin-bottom: 10px;
        }

        .completed {
          background: #064e3b;
          color: #6ee7b7;
        }

        .pending {
          background: #422006;
          color: #fcd34d;
        }

        .empty {
          text-align: center;
          padding: 45px 20px;
          color: #64748b;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }

        .actions .button {
          flex: 1;
          min-width: 140px;
        }

        .action-panel {
          margin-top: 25px;
          border-top: 1px solid #27364b;
          padding-top: 22px;
        }

        .action-panel h3 {
          font-size: 16px;
          margin: 0 0 15px;
        }

        .action-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .footer {
          text-align: center;
          padding: 30px;
          color: #64748b;
          border-top: 1px solid #1e293b;
          font-size: 13px;
        }

        @media (max-width: 900px) {
          .main {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .navbar {
            padding: 18px 5%;
          }

          .hero {
            padding: 45px 5% 25px;
          }

          .main {
            padding: 20px 5% 50px;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .action-inputs {
            grid-template-columns: 1fr;
          }

          .projects-header {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      {/* Navigation */}
      <nav className="navbar">
        <div className="logo">
          Freelance<span>Chain</span>
        </div>

        <div className="nav-right">
          {account && (
            <div className="wallet-info">
              {shortenAddress(account)} | {Number(balance).toFixed(4)} ETH
            </div>
          )}

          <button
            className="button primary"
            onClick={connectWallet}
            disabled={loading}
          >
            {account ? "Wallet Connected" : "Connect Wallet"}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <h1>
          Freelancing powered by <span>Blockchain.</span>
        </h1>

        <p>
          A decentralized freelance platform that makes payments
          transparent and secure using smart contracts and
          milestone-based escrow.
        </p>

        <div className="stats">
          <div className="stat">
            <h3>{projects.length}</h3>
            <p>Total Projects</p>
          </div>

          <div className="stat">
            <h3>{projects.filter((p) => p.completed).length}</h3>
            <p>Completed Projects</p>
          </div>

          <div className="stat">
            <h3>{Number(balance).toFixed(4)}</h3>
            <p>Your Wallet Balance (ETH)</p>
          </div>
        </div>
      </section>

      {/* Main */}
      <main className="main">
        {/* Create project form */}
        <section className="panel">
          <h2>Create a Project</h2>

          <form onSubmit={createProject}>
            <div className="form-group">
              <label>Freelancer Wallet Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={freelancer}
                onChange={(e) => setFreelancer(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Project Title</label>
              <input
                type="text"
                placeholder="Enter project title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Milestone Description</label>
              <textarea
                placeholder="Describe the work to be completed"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Escrow Amount (ETH)</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Enter amount in ETH"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <button
              className="button primary full"
              type="submit"
              disabled={loading}
            >
              {loading ? "Processing..." : "Create Project & Fund Escrow"}
            </button>
          </form>

          {message && <div className="message">{message}</div>}
        </section>

        {/* Dashboard */}
        <section className="panel">
          <div className="projects-header">
            <h2>Project Dashboard</h2>

            <button
              className="button secondary"
              onClick={() => contract && loadProjects(contract)}
              disabled={!contract || loading}
            >
              Refresh
            </button>
          </div>

          <div className="project-list">
            {projects.length === 0 ? (
              <div className="empty">
                <h3>No projects found</h3>
                <p>Create your first project to get started.</p>
              </div>
            ) : (
              projects.map((project) => (
                <div className="project-card" key={project.id}>
                  <span
                    className={`status ${
                      project.completed ? "completed" : "pending"
                    }`}
                  >
                    {project.completed ? "Completed" : "In Progress"}
                  </span>

                  <h3>
                    #{project.id} — {project.title}
                  </h3>

                  <div className="project-meta">
                    <div className="meta">
                      Escrow Amount
                      <strong>{project.totalAmount} ETH</strong>
                    </div>

                    <div className="meta">
                      Milestones
                      <strong>{project.milestoneCount}</strong>
                    </div>

                    <div className="meta">
                      Client
                      <strong>{shortenAddress(project.client)}</strong>
                    </div>

                    <div className="meta">
                      Freelancer
                      <strong>{shortenAddress(project.freelancer)}</strong>
                    </div>
                  </div>

                  <p>
                    <strong>Client:</strong> {project.client}
                  </p>

                  <p>
                    <strong>Freelancer:</strong> {project.freelancer}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Milestone actions */}
          <div className="action-panel">
            <h3>Milestone Actions</h3>

            <form>
              <div className="action-inputs">
                <div className="form-group">
                  <label>Project ID</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Project ID"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Milestone ID</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Milestone ID"
                    value={milestoneId}
                    onChange={(e) => setMilestoneId(e.target.value)}
                  />
                </div>
              </div>

              <div className="actions">
                <button
                  type="button"
                  className="button primary"
                  onClick={submitMilestone}
                  disabled={loading}
                >
                  Submit Milestone
                </button>

                <button
                  type="button"
                  className="button green"
                  onClick={approveMilestone}
                  disabled={loading}
                >
                  Approve & Release Payment
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        FreelanceChain — Decentralized Freelancing with Smart Contracts
      </footer>
    </div>
  );
}
