MD_PATHS := README.md AGENTS.md docs skills
MDFORMAT := uvx --from mdformat==1.0.0 --with mdformat-gfm==1.0.0 --with mdformat-frontmatter==2.2.0 --with mdformat-sembr==0.2.0 mdformat
SKILLS_VALIDATE := uvx --from skills-ref==0.1.1 agentskills validate

.PHONY: all check check-format check-links check-design check-skills format help

all: check help ## Run all checks, then show available commands

check: check-format check-links check-design check-skills ## Run all checks

check-format: ## Check Markdown formatting
	$(MDFORMAT) --check --wrap keep $(MD_PATHS)

check-links: ## Check local links and anchors
	uvx --from mdlinkcheck==0.2.0 mdlinkcheck $(MD_PATHS)

check-design: ## Check the design indexes and overview coverage
	@set -e; for file in docs/design/index.md docs/design/overviews/index.md; do \
		[ -f "$$file" ] || { echo "Missing design index: $$file"; exit 1; }; \
	done
	@set -e; find docs/design/overviews -type f -name '*.md' | while IFS= read -r doc; do \
		name=$${doc#docs/design/overviews/}; [ "$$name" = "index.md" ] && continue; \
		grep -Fq "($$name)" docs/design/overviews/index.md || { \
			echo "Overview is missing from docs/design/overviews/index.md: $$name"; exit 1; \
		}; \
	done

check-skills: ## Validate every skill in skills/
	@set -e; for skill in skills/*/; do \
		[ -d "$$skill" ] || continue; \
		$(SKILLS_VALIDATE) "$$skill"; \
	done

format: ## Format Markdown files
	$(MDFORMAT) --wrap keep $(MD_PATHS)

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  %-16s %s\n", $$1, $$2}'
