MD_PATHS := README.md AGENTS.md docs skills
MDFORMAT := uvx --from mdformat==1.0.0 --with mdformat-gfm==1.0.0 --with mdformat-frontmatter==2.2.0 mdformat

.PHONY: all check check-format check-links check-skills format

all: check

check: check-format check-links check-skills

check-format:
	$(MDFORMAT) --check --wrap 100 $(MD_PATHS)

check-links:
	uvx --from mdlinkcheck==0.2.0 mdlinkcheck $(MD_PATHS)

check-skills:
	uvx --from skills-ref==0.1.1 agentskills validate skills/seam-adopt
	uvx --from skills-ref==0.1.1 agentskills validate skills/seam-shape
	uvx --from skills-ref==0.1.1 agentskills validate skills/seam-work
	uvx --from skills-ref==0.1.1 agentskills validate skills/seam-review
	uvx --from skills-ref==0.1.1 agentskills validate skills/seam-track-kata

format:
	$(MDFORMAT) --wrap 100 $(MD_PATHS)
