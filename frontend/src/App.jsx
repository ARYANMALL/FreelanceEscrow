
import { useState } from "react";
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
  const [balance, setBalance] = useState("");
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

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        setMessage("Please install MetaMask in Chrome.");
        return;
      }

      const provider = new BrowserProvider(window.ethereum);

      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();

      if (network.chainId !== 1337n) {
        setMessage("Please switch MetaMask to Local Ganache (Chain ID 1337).");
        return;
      }

      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const userBalance = await provider.getBalance(userAddress);

      const escrowContract = new Contract(
        CONTRACT_ADDRESS,
        ABI,
        signer
      );

      setAccount(userAddress);
      setBalance(formatEther(userBalance));
      setContract(escrowContract);
      setMessage("Wallet connected successfully!");

      await loadProjects(escrowContract);
    } catch (error) {
      console.error(error);
      setMessage(error.shortMessage || error.message);
    }
  }

  async function loadProjects(activeContract = contract) {
    try {
      if (!activeContract) {
        setMessage("Please connect your wallet first.");
        return;
      }

      const count = Number(await activeContract.projectCount());
      const projectList = [];

      for (let i = 1; i <= count; i++) {
        const data = await activeContract.getProject(i);
        const milestoneCount = Number(
          await activeContract.getMilestoneCount(i)
        );

        projectList.push({
          id: i,
          client: data[0],
          freelancer: data[1],
          title: data[2],
          totalAmount: formatEther(data[3]),
          completed: data[4],
          milestoneCount
        });
      }

      setProjects(projectList);
    } catch (error) {
      console.error(error);
      setMessage(error.shortMessage || error.message);
    }
  }

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

      setLoading(true);
      setMessage("Please confirm the transaction in MetaMask...");

      const tx = await contract.createProject(
        freelancer,
        title,
        [description],
        [parseEther(amount)],
        { value: parseEther(amount) }
      );

      setMessage("Transaction submitted. Waiting for confirmation...");
      await tx.wait();

      setMessage("Project created successfully!");

      setFreelancer("");
      setTitle("");
      setDescription("");
      setAmount("");

      const provider = new BrowserProvider(window.ethereum);
      const updatedBalance = await provider.getBalance(account);
      setBalance(formatEther(updatedBalance));

      await loadProjects();
    } catch (error) {
      console.error(error);
      setMessage(error.shortMessage || error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitMilestone() {
    try {
      if (!contract) {
        setMessage("Connect your wallet first.");
        return;
      }

      setLoading(true);
      setMessage("Confirm the submission in MetaMask...");

      const tx = await contract.submitMilestone(
        Number(projectId),
        Number(milestoneId)
      );

      await tx.wait();
      setMessage("Milestone submitted successfully!");
      await loadProjects();
    } catch (error) {
      console.error(error);
      setMessage(error.shortMessage || error.message);
    } finally {
      setLoading(false);
    }
  }

  async function approveMilestone() {
    try {
      if (!contract) {
        setMessage("Connect your wallet first.");
        return;
      }

      setLoading(true);
      setMessage("Confirm the approval in MetaMask...");

      const tx = await contract.approveMilestone(
        Number(projectId),
        Number(milestoneId)
      );

      await tx.wait();
      setMessage("Milestone approved and payment released!");
      await loadProjects();

      const provider = new BrowserProvider(window.ethereum);
      const updatedBalance = await provider.getBalance(account);
      setBalance(formatEther(updatedBalance));
    } catch (error) {
      console.error(error);
      setMessage(error.shortMessage || error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>FreelanceChain</h1>
        <p>Blockchain-powered Freelance Escrow Platform</p>

        <button onClick={connectWallet} disabled={loading}>
          {account ? "Wallet Connected" : "Connect Wallet"}
        </button>

        {account && (
          <div className="wallet-info">
            <p>Account: {account}</p>
            <p>Balance: {Number(balance).toFixed(4)} ETH</p>
            <p>Network: Local Ganache</p>
          </div>
        )}
      </header>

      {message && <p className="message">{message}</p>}

      <main>
        <section>
          <h2>Create a Project</h2>

          <form onSubmit={createProject}>
            <input
              type="text"
              placeholder="Freelancer wallet address"
              value={freelancer}
              onChange={(e) => setFreelancer(e.target.value)}
            />

            <input
              type="text"
              placeholder="Project title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <input
              type="text"
              placeholder="Milestone description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <input
              type="number"
              placeholder="Amount in ETH"
              min="0"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <button type="submit" disabled={loading || !contract}>
              Create Project & Deposit ETH
            </button>
          </form>
        </section>

        <section>
          <h2>Milestone Actions</h2>

          <input
            type="number"
            min="1"
            placeholder="Project ID"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          />

          <input
            type="number"
            min="0"
            placeholder="Milestone ID (starts at 0)"
            value={milestoneId}
            onChange={(e) => setMilestoneId(e.target.value)}
          />

          <button onClick={submitMilestone} disabled={loading || !contract}>
            Submit Milestone (Freelancer)
          </button>

          <button onClick={approveMilestone} disabled={loading || !contract}>
            Approve Milestone (Client)
          </button>
        </section>

        <section>
          <h2>Project Dashboard</h2>

          <button
            onClick={() => loadProjects()}
            disabled={loading || !contract}
          >
            Refresh Projects
          </button>

          {projects.length === 0 ? (
            <p>No projects found.</p>
          ) : (
            projects.map((project) => (
              <div className="project-card" key={project.id}>
                <h3>#{project.id} - {project.title}</h3>
                <p>Client: {project.client}</p>
                <p>Freelancer: {project.freelancer}</p>
                <p>Total: {project.totalAmount} ETH</p>
                <p>Milestones: {project.milestoneCount}</p>
                <p>Status: {project.completed ? "Completed" : "In Progress"}</p>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
