import { useEffect, useState } from "react";
import {
  BrowserProvider,
  Contract,
  formatEther,
  parseEther
} from "ethers";

import { CONTRACT_ADDRESS, ABI } from "./contract";
import "./App.css";

function App() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [contract, setContract] = useState(null);
  const [projects, setProjects] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [freelancer, setFreelancer] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const [projectId, setProjectId] = useState("");
  const [milestoneId, setMilestoneId] = useState("0");

  async function updateBalance(address) {
    const provider = new BrowserProvider(window.ethereum);
    const value = await provider.getBalance(address);
    setBalance(Number(formatEther(value)).toFixed(4));
  }

  async function loadProjects(activeContract) {
    if (!activeContract) return;

    try {
      const count = Number(await activeContract.projectCount());
      const list = [];

      for (let i = 1; i <= count; i++) {
        const data = await activeContract.getProject(i);
        const milestoneCount = Number(
          await activeContract.getMilestoneCount(i)
        );

        list.push({
          id: i,
          client: data[0],
          freelancer: data[1],
          title: data[2],
          totalAmount: formatEther(data[3]),
          completed: data[4],
          milestoneCount
        });
      }

      setProjects(list);
    } catch (error) {
      console.error("Project loading error:", error);
      setMessage(error.shortMessage || error.message);
    }
  }

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        setMessage("Please install MetaMask.");
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      if (!accounts.length) return;

      const network = await provider.getNetwork();

      if (network.chainId !== 1337n) {
        setMessage("Please switch MetaMask to Ganache (Chain ID 1337).");
        return;
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const escrow = new Contract(CONTRACT_ADDRESS, ABI, signer);

      setAccount(address);
      setContract(escrow);
      await updateBalance(address);
      await loadProjects(escrow);

      setMessage("Wallet connected successfully!");
    } catch (error) {
      console.error(error);
      setMessage(error.shortMessage || error.message);
    }
  }

  // Automatically update the app when the selected MetaMask account changes.
  useEffect(() => {
    if (!window.ethereum) return;

    async function handleAccountsChanged(accounts) {
      if (!accounts || accounts.length === 0) {
        setAccount("");
        setBalance("0");
        setContract(null);
        setProjects([]);
        setMessage("Wallet disconnected. Connect your wallet to continue.");
        return;
      }

      try {
        const provider = new BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();

        if (network.chainId !== 1337n) {
          setAccount("");
          setBalance("0");
          setContract(null);
          setProjects([]);
          setMessage("Please switch MetaMask to Ganache (Chain ID 1337).");
          return;
        }

        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const escrow = new Contract(CONTRACT_ADDRESS, ABI, signer);

        setAccount(address);
        setContract(escrow);
        setMessage("Wallet account changed successfully!");

        await updateBalance(address);
        await loadProjects(escrow);
      } catch (error) {
        console.error("Account change error:", error);
        setMessage(error.shortMessage || error.message);
      }
    }

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  async function createProject(event) {
    event.preventDefault();

    try {
      if (!contract) {
        setMessage("Connect your wallet first.");
        return;
      }

      if (!freelancer || !title || !description || !amount) {
        setMessage("Please fill in all project details.");
        return;
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(freelancer)) {
        setMessage("Enter a valid freelancer wallet address.");
        return;
      }

      if (Number(amount) <= 0) {
        setMessage("Enter an amount greater than zero.");
        return;
      }

      setLoading(true);
      setMessage("Waiting for transaction confirmation...");

      const value = parseEther(amount);
      const tx = await contract.createProject(
        freelancer,
        title,
        [description],
        [value],
        { value }
      );

      await tx.wait();

      setMessage("Project created successfully!");
      setFreelancer("");
      setTitle("");
      setDescription("");
      setAmount("");

      await loadProjects(contract);
      await updateBalance(account);
    } catch (error) {
      console.error(error);
      setMessage(error.shortMessage || error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitMilestone() {
    try {
      if (!contract || !projectId) {
        setMessage("Connect wallet and enter a project ID.");
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
      console.error(error);
      setMessage(error.shortMessage || error.message);
    } finally {
      setLoading(false);
    }
  }

  async function approveMilestone() {
    try {
      if (!contract || !projectId) {
        setMessage("Connect wallet and enter a project ID.");
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
      console.error(error);
      setMessage(error.shortMessage || error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="brand">
          <div className="brand-icon">F</div>
          <span>
            Freelance<span className="accent">Chain</span>
          </span>
        </div>

        <button
          className="wallet-button"
          onClick={connectWallet}
          disabled={loading}
        >
          {account
            ? `${account.slice(0, 6)}...${account.slice(-4)}`
            : "Connect Wallet"}
        </button>
      </nav>

      <main className="container">
        <section className="hero">
          <div>
            <span className="eyebrow">DECENTRALIZED FREELANCING</span>
            <h1>
              Work together.
              <br />
              <span>Pay with confidence.</span>
            </h1>
            <p>
              A secure blockchain-powered escrow platform. Create projects,
              manage milestones, and release payments transparently.
            </p>
          </div>

          <div className="hero-card">
            <span className="small-label">YOUR WALLET BALANCE</span>
            <h2>
              {balance} <span>ETH</span>
            </h2>
            <div className="network-status">
              <span className="status-dot"></span>
              Ganache Local Network
            </div>
          </div>
        </section>

        {message && <div className="message">{message}</div>}

        <section className="stats">
          <div className="stat-card">
            <span>Total Projects</span>
            <h2>{projects.length}</h2>
          </div>
          <div className="stat-card">
            <span>Active Projects</span>
            <h2>{projects.filter((p) => !p.completed).length}</h2>
          </div>
          <div className="stat-card">
            <span>Completed Projects</span>
            <h2>{projects.filter((p) => p.completed).length}</h2>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">GET STARTED</span>
                <h2>Create a Project</h2>
              </div>
              <span className="heading-icon">＋</span>
            </div>

            <form onSubmit={createProject} className="project-form">
              <label>Freelancer Wallet Address</label>
              <input
                value={freelancer}
                onChange={(e) => setFreelancer(e.target.value)}
                placeholder="0x..."
              />

              <label>Project Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Website Development"
              />

              <label>Milestone Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the work to be completed..."
                rows="3"
              />

              <label>Milestone Amount (ETH)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.10"
              />

              <button
                className="primary-button"
                disabled={loading || !contract}
              >
                {loading ? "Processing..." : "Create Project & Deposit"}
              </button>
            </form>
          </div>

          <div className="panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">PROJECT MANAGEMENT</span>
                <h2>Milestone Actions</h2>
              </div>
              <span className="heading-icon">✓</span>
            </div>

            <div className="project-form">
              <label>Project ID</label>
              <input
                type="number"
                min="1"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="Enter project ID"
              />

              <label>Milestone ID</label>
              <input
                type="number"
                min="0"
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
                placeholder="0"
              />

              <button
                className="primary-button"
                onClick={submitMilestone}
                disabled={loading || !contract}
              >
                Submit Milestone
              </button>

              <button
                className="secondary-button"
                onClick={approveMilestone}
                disabled={loading || !contract}
              >
                Approve & Release Payment
              </button>

              <p className="helper-text">
                Freelancer submits completed work. Client approves it to
                release payment.
              </p>
            </div>
          </div>
        </section>

        <section className="dashboard">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR WORKSPACE</span>
              <h2>Project Dashboard</h2>
            </div>
            <span className="project-count">{projects.length} Projects</span>
          </div>

          {projects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">◇</div>
              <h3>No projects yet</h3>
              <p>Connect your wallet and create your first escrow project.</p>
            </div>
          ) : (
            <div className="project-grid">
              {projects.map((project) => (
                <div className="project-card" key={project.id}>
                  <div className="project-card-top">
                    <span className="project-number">
                      PROJECT #{project.id}
                    </span>
                    <span
                      className={
                        project.completed ? "status completed" : "status active"
                      }
                    >
                      {project.completed ? "Completed" : "In Progress"}
                    </span>
                  </div>

                  <h3>{project.title}</h3>

                  <div className="project-detail">
                    <span>Project Value</span>
                    <strong>{project.totalAmount} ETH</strong>
                  </div>

                  <div className="project-detail">
                    <span>Milestones</span>
                    <strong>{project.milestoneCount}</strong>
                  </div>

                  <div className="address-detail">
                    <span>Client</span>
                    <p>{project.client}</p>
                  </div>

                  <div className="address-detail">
                    <span>Freelancer</span>
                    <p>{project.freelancer}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer>
          FreelanceChain · Built on Ethereum-compatible blockchain technology
        </footer>
      </main>
    </div>
  );
}

export default App;
