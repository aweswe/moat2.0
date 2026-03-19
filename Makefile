.PHONY: governance-build governance-run governance-test

# Builds the secure AgentTrace Governance Docker isolation image
governance-build:
	docker build -t agenttrace/governance:py3.12.1 -f docker/governance/Dockerfile .

# Runs the Governance wrapper Sandbox, mapping traces via volume mounts natively and restricting out-of-bounds network
governance-run:
	docker-compose -f docker-compose.governance.yml up --abort-on-container-exit

# Test driver for executing the Docker container against a baseline Trace to assert validation passes
governance-test:
	python test_governance_docker.py
