
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FreelanceEscrow {

    struct Milestone {
        string description;
        uint256 amount;
        bool submitted;
        bool approved;
    }

    struct Project {
        address payable client;
        address payable freelancer;
        string title;
        uint256 totalAmount;
        bool completed;
        Milestone[] milestones;
    }

    uint256 public projectCount;

    mapping(uint256 => Project) public projects;

    event ProjectCreated(uint256 projectId, address client);
    event MilestoneSubmitted(uint256 projectId, uint256 milestoneId);
    event PaymentReleased(uint256 projectId, uint256 milestoneId);

    function createProject(
        address payable _freelancer,
        string memory _title,
        string[] memory _descriptions,
        uint256[] memory _amounts
    ) public payable {
        require(_freelancer != address(0), "Invalid freelancer");
        require(_freelancer != msg.sender, "Invalid freelancer");
        require(_descriptions.length > 0, "No milestones");
        require(_descriptions.length == _amounts.length, "Length mismatch");

        uint256 total;

        for (uint256 i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Invalid amount");
            total += _amounts[i];
        }

        require(msg.value == total, "Incorrect deposit");

        projectCount++;
        Project storage p = projects[projectCount];

        p.client = payable(msg.sender);
        p.freelancer = _freelancer;
        p.title = _title;
        p.totalAmount = total;

        for (uint256 i = 0; i < _amounts.length; i++) {
            p.milestones.push(Milestone(
                _descriptions[i], _amounts[i], false, false
            ));
        }

        emit ProjectCreated(projectCount, msg.sender);
    }

    function submitMilestone(uint256 _projectId, uint256 _milestoneId) public {
        Project storage p = projects[_projectId];

        require(msg.sender == p.freelancer, "Only freelancer");
        require(!p.completed, "Project completed");
        require(_milestoneId < p.milestones.length, "Invalid milestone");

        Milestone storage m = p.milestones[_milestoneId];

        require(!m.submitted && !m.approved, "Already submitted");

        m.submitted = true;

        emit MilestoneSubmitted(_projectId, _milestoneId);
    }

    function approveMilestone(uint256 _projectId, uint256 _milestoneId) public {
        Project storage p = projects[_projectId];

        require(msg.sender == p.client, "Only client");
        require(!p.completed, "Project completed");
        require(_milestoneId < p.milestones.length, "Invalid milestone");

        Milestone storage m = p.milestones[_milestoneId];

        require(m.submitted && !m.approved, "Not ready for approval");

        m.approved = true;

        (bool success, ) = p.freelancer.call{value: m.amount}("");
        require(success, "Payment failed");

        bool allApproved = true;

        for (uint256 i = 0; i < p.milestones.length; i++) {
            if (!p.milestones[i].approved) {
                allApproved = false;
                break;
            }
        }

        if (allApproved) {
            p.completed = true;
        }

        emit PaymentReleased(_projectId, _milestoneId);
    }

    function getProject(uint256 _projectId)
        public view returns (
            address client,
            address freelancer,
            string memory title,
            uint256 totalAmount,
            bool completed
        )
    {
        Project storage p = projects[_projectId];

        return (
            p.client,
            p.freelancer,
            p.title,
            p.totalAmount,
            p.completed
        );
    }

    function getMilestoneCount(uint256 _projectId)
        public view returns (uint256)
    {
        return projects[_projectId].milestones.length;
    }
}
