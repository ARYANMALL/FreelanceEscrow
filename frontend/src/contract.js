export const CONTRACT_ADDRESS = "0x570ff9d4Ceb12575EbeFBf15E8F842459D34e752";

export const ABI = [
  "function projectCount() view returns (uint256)",

  "function createProject(address _freelancer, string _title, string[] _descriptions, uint256[] _amounts) payable",

  "function submitMilestone(uint256 _projectId, uint256 _milestoneId)",

  "function approveMilestone(uint256 _projectId, uint256 _milestoneId)",

  "function getProject(uint256 _projectId) view returns (uint256 id, address client, address freelancer, string title, uint256 totalBudget, uint256 releasedAmount, uint8 status, uint256 disputeId, uint256 createdAt, bool exists)",

  "function getMilestoneCount(uint256 _projectId) view returns (uint256)"
];