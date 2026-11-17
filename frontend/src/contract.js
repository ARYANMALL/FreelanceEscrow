
export const CONTRACT_ADDRESS = "0x86D84AF89AfE42d962DAf2ca1378c71B2002Ec9a";

export const ABI = [
  "function projectCount() view returns (uint256)",
  "function createProject(address _freelancer, string _title, string[] _descriptions, uint256[] _amounts) payable",
  "function submitMilestone(uint256 _projectId, uint256 _milestoneId)",
  "function approveMilestone(uint256 _projectId, uint256 _milestoneId)",
  "function getProject(uint256 _projectId) view returns (address client, address freelancer, string title, uint256 totalAmount, bool completed)",
  "function getMilestoneCount(uint256 _projectId) view returns (uint256)",
  "event ProjectCreated(uint256 projectId, address client)",
  "event MilestoneSubmitted(uint256 projectId, uint256 milestoneId)",
  "event PaymentReleased(uint256 projectId, uint256 milestoneId)"
];
