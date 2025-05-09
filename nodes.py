import os
import re
import yaml
import json
from pocketflow import Node, BatchNode
from utils.crawl_github_files import crawl_github_files
from utils.call_llm import call_llm
from utils.crawl_local_files import crawl_local_files
from utils.cloud_analyzer import analyze_cloud_readiness
from utils.status_updater import StatusUpdater
from utils.logging_utils import get_logger


# Helper to get content for specific file indices
def get_content_for_indices(files_data, indices):
    content_map = {}
    for i in indices:
        if 0 <= i < len(files_data):
            path, content = files_data[i]
            content_map[f"{i} # {path}"] = (
                content  # Use index + path as key for context
            )
    return content_map


class FetchRepo(Node):
    def prep(self, shared):
        repo_url = shared.get("repo_url")
        local_dir = shared.get("local_dir")
        project_name = shared.get("project_name")

        if not project_name:
            # Basic name derivation from URL or directory
            if repo_url:
                project_name = repo_url.split("/")[-1].replace(".git", "")
            else:
                project_name = os.path.basename(os.path.abspath(local_dir))
            shared["project_name"] = project_name

        # Get file patterns directly from shared
        include_patterns = shared["include_patterns"]
        exclude_patterns = shared["exclude_patterns"]
        max_file_size = shared["max_file_size"]

        return {
            "repo_url": repo_url,
            "local_dir": local_dir,
            "token": shared.get("github_token"),
            "include_patterns": include_patterns,
            "exclude_patterns": exclude_patterns,
            "max_file_size": max_file_size,
            "use_relative_paths": True,
        }

    def exec(self, prep_res):
        if prep_res["repo_url"]:
            print(f"Crawling repository: {prep_res['repo_url']}...")
            result = crawl_github_files(
                repo_url=prep_res["repo_url"],
                token=prep_res["token"],
                include_patterns=prep_res["include_patterns"],
                exclude_patterns=prep_res["exclude_patterns"],
                max_file_size=prep_res["max_file_size"],
                use_relative_paths=prep_res["use_relative_paths"],
            )
        else:
            print(f"Crawling directory: {prep_res['local_dir']}...")
            result = crawl_local_files(
                directory=prep_res["local_dir"],
                include_patterns=prep_res["include_patterns"],
                exclude_patterns=prep_res["exclude_patterns"],
                max_file_size=prep_res["max_file_size"],
                use_relative_paths=prep_res["use_relative_paths"],
            )

        # Convert dict to list of tuples: [(path, content), ...]
        files_list = list(result.get("files", {}).items())
        files_count = len(files_list)
        
        # Check if we have a partial clone situation
        is_partial_clone = result.get("stats", {}).get("partial_clone", False)
        error_message = result.get("stats", {}).get("error", None)
        
        if files_count == 0:
            # No files at all - raise error
            raise ValueError("Failed to fetch files")
        elif is_partial_clone and files_count > 0:
            # We have some files despite git-lfs errors
            print(f"Warning: Partial repository clone due to git-lfs issues. Proceeding with {files_count} available files.")
            print(f"Error details: {error_message}")
            
        print(f"Fetched {files_count} files.")
        return files_list

    def post(self, shared, prep_res, exec_res):
        shared["files"] = exec_res  # List of (path, content) tuples


class IdentifyAbstractions(Node):
    def prep(self, shared):
        files_data = shared["files"]
        project_name = shared["project_name"]  # Get project name
        language = shared.get("language", "english")  # Get language
        use_cache = shared.get("use_cache", True)  # Get use_cache flag, default to True
        max_abstraction_num = shared.get("max_abstraction_num", 10)  # Get max_abstraction_num, default to 10

        # Helper to create context from files, respecting limits (basic example)
        def create_llm_context(files_data):
            context = ""
            file_info = []  # Store tuples of (index, path)
            for i, (path, content) in enumerate(files_data):
                entry = f"--- File Index {i}: {path} ---\n{content}\n\n"
                context += entry
                file_info.append((i, path))

            return context, file_info  # file_info is list of (index, path)

        context, file_info = create_llm_context(files_data)
        # Format file info for the prompt (comment is just a hint for LLM)
        file_listing_for_prompt = "\n".join(
            [f"- {idx} # {path}" for idx, path in file_info]
        )
        return (
            context,
            file_listing_for_prompt,
            len(files_data),
            project_name,
            language,
            use_cache,
            max_abstraction_num,
        )  # Return all parameters

    def exec(self, prep_res):
        (
            context,
            file_listing_for_prompt,
            file_count,
            project_name,
            language,
            use_cache,
            max_abstraction_num,
        ) = prep_res  # Unpack all parameters
        print(f"Identifying abstractions using LLM...")

        # Add language instruction and hints only if not English
        language_instruction = ""
        name_lang_hint = ""
        desc_lang_hint = ""
        if language.lower() != "english":
            language_instruction = f"IMPORTANT: Generate the `name` and `description` for each abstraction in **{language.capitalize()}** language. Do NOT use English for these fields.\n\n"
            # Keep specific hints here as name/description are primary targets
            name_lang_hint = f" (value in {language.capitalize()})"
            desc_lang_hint = f" (value in {language.capitalize()})"

        prompt = f"""
For the project `{project_name}`:

Codebase Context:
{context}

{language_instruction}Analyze the codebase context also what business features/functionality it provides.
Identify the top 5-{max_abstraction_num} core most important abstractions to help those new to the codebase.

For each abstraction, provide:
1. A concise `name`{name_lang_hint}.
2. A beginner-friendly `description` explaining what it is with a simple analogy, in around 100 words{desc_lang_hint}.
3. A list of relevant `file_indices` (integers) using the format `idx # path/comment`.

List of file indices and paths present in the context:
{file_listing_for_prompt}

Format the output as a YAML list of dictionaries:

```yaml
- name: |
    Query Processing{name_lang_hint}
  description: |
    Explains what the abstraction does.
    It's like a central dispatcher routing requests.{desc_lang_hint}
  file_indices:
    - 0 # path/to/file1.py
    - 3 # path/to/related.py
- name: |
    Query Optimization{name_lang_hint}
  description: |
    Another core concept, similar to a blueprint for objects.{desc_lang_hint}
  file_indices:
    - 5 # path/to/another.js
# ... up to {max_abstraction_num} abstractions
```"""
        response = call_llm(prompt, use_cache=use_cache)  # Pass use_cache parameter

        # --- Validation ---
        yaml_str = response.strip().split("```yaml")[1].split("```")[0].strip()
        # add whitespace to fix llm generation error(except -)
        abstractions = yaml.safe_load(yaml_str)

        if not isinstance(abstractions, list):
            raise ValueError("LLM Output is not a list")

        validated_abstractions = []
        for item in abstractions:
            if not isinstance(item, dict) or not all(
                k in item for k in ["name", "description", "file_indices"]
            ):
                raise ValueError(f"Missing keys in abstraction item: {item}")
            if not isinstance(item["name"], str):
                raise ValueError(f"Name is not a string in item: {item}")
            if not isinstance(item["description"], str):
                raise ValueError(f"Description is not a string in item: {item}")
            if not isinstance(item["file_indices"], list):
                raise ValueError(f"file_indices is not a list in item: {item}")

            # Validate indices
            validated_indices = []
            for idx_entry in item["file_indices"]:
                try:
                    if isinstance(idx_entry, int):
                        idx = idx_entry
                    elif isinstance(idx_entry, str) and "#" in idx_entry:
                        idx = int(idx_entry.split("#")[0].strip())
                    else:
                        idx = int(str(idx_entry).strip())

                    if not (0 <= idx < file_count):
                        raise ValueError(
                            f"Invalid file index {idx} found in item {item['name']}. Max index is {file_count - 1}."
                        )
                    validated_indices.append(idx)
                except (ValueError, TypeError):
                    raise ValueError(
                        f"Could not parse index from entry: {idx_entry} in item {item['name']}"
                    )

            item["files"] = sorted(list(set(validated_indices)))
            # Store only the required fields
            validated_abstractions.append(
                {
                    "name": item["name"],  # Potentially translated name
                    "description": item[
                        "description"
                    ],  # Potentially translated description
                    "files": item["files"],
                }
            )

        print(f"Identified {len(validated_abstractions)} abstractions.")
        return validated_abstractions

    def post(self, shared, prep_res, exec_res):
        shared["abstractions"] = (
            exec_res  # List of {"name": str, "description": str, "files": [int]}
        )


class AnalyzeRelationships(Node):
    def prep(self, shared):
        abstractions = shared[
            "abstractions"
        ]  # Now contains 'files' list of indices, name/description potentially translated
        files_data = shared["files"]
        project_name = shared["project_name"]  # Get project name
        language = shared.get("language", "english")  # Get language
        use_cache = shared.get("use_cache", True)  # Get use_cache flag, default to True

        # Get the actual number of abstractions directly
        num_abstractions = len(abstractions)

        # Create context with abstraction names, indices, descriptions, and relevant file snippets
        context = "Identified Abstractions:\\n"
        all_relevant_indices = set()
        abstraction_info_for_prompt = []
        for i, abstr in enumerate(abstractions):
            # Use 'files' which contains indices directly
            file_indices_str = ", ".join(map(str, abstr["files"]))
            # Abstraction name and description might be translated already
            info_line = f"- Index {i}: {abstr['name']} (Relevant file indices: [{file_indices_str}])\\n  Description: {abstr['description']}"
            context += info_line + "\\n"
            abstraction_info_for_prompt.append(
                f"{i} # {abstr['name']}"
            )  # Use potentially translated name here too
            all_relevant_indices.update(abstr["files"])

        context += "\\nRelevant File Snippets (Referenced by Index and Path):\\n"
        # Get content for relevant files using helper
        relevant_files_content_map = get_content_for_indices(
            files_data, sorted(list(all_relevant_indices))
        )
        # Format file content for context
        file_context_str = "\\n\\n".join(
            f"--- File: {idx_path} ---\\n{content}"
            for idx_path, content in relevant_files_content_map.items()
        )
        context += file_context_str

        return (
            context,
            "\n".join(abstraction_info_for_prompt),
            num_abstractions, # Pass the actual count
            project_name,
            language,
            use_cache,
        )  # Return use_cache

    def exec(self, prep_res):
        (
            context,
            abstraction_listing,
            num_abstractions, # Receive the actual count
            project_name,
            language,
            use_cache,
         ) = prep_res  # Unpack use_cache
        print(f"Analyzing relationships using LLM...")

        # Add language instruction and hints only if not English
        language_instruction = ""
        lang_hint = ""
        list_lang_note = ""
        if language.lower() != "english":
            language_instruction = f"IMPORTANT: Generate the `summary` and relationship `label` fields in **{language.capitalize()}** language. Do NOT use English for these fields.\n\n"
            lang_hint = f" (in {language.capitalize()})"
            list_lang_note = f" (Names might be in {language.capitalize()})"  # Note for the input list

        prompt = f"""
Based on the following abstractions and relevant code snippets from the project `{project_name}`:

List of Abstraction Indices and Names{list_lang_note}:
{abstraction_listing}

Context (Abstractions, Descriptions, Code):
{context}

{language_instruction}Please provide:
1. A high-level `summary` of the project's main purpose and functionality in a few beginner-friendly sentences{lang_hint}. Use markdown formatting with **bold** and *italic* text to highlight important concepts.
2. A list (`relationships`) describing the key interactions between these abstractions. For each relationship, specify:
    - `from_abstraction`: Index of the source abstraction (e.g., `0 # AbstractionName1`)
    - `to_abstraction`: Index of the target abstraction (e.g., `1 # AbstractionName2`)
    - `label`: A brief label for the interaction **in just a few words**{lang_hint} (e.g., "Manages", "Inherits", "Uses").
    Ideally the relationship should be backed by one abstraction calling or passing parameters to another.
    Simplify the relationship and exclude those non-important ones.

IMPORTANT: Make sure EVERY abstraction is involved in at least ONE relationship (either as source or target). Each abstraction index must appear at least once across all relationships.

Format the output as YAML:

```yaml
summary: |
  A brief, simple explanation of the project{lang_hint}.
  Can span multiple lines with **bold** and *italic* for emphasis.
relationships:
  - from_abstraction: 0 # AbstractionName1
    to_abstraction: 1 # AbstractionName2
    label: "Manages"{lang_hint}
  - from_abstraction: 2 # AbstractionName3
    to_abstraction: 0 # AbstractionName1
    label: "Provides config"{lang_hint}
  # ... other relationships
```

Now, provide the YAML output:
"""
        response = call_llm(prompt, use_cache=use_cache)

        # --- Validation ---
        yaml_str = response.strip().split("```yaml")[1].split("```")[0].strip()
        relationships_data = yaml.safe_load(yaml_str)

        if not isinstance(relationships_data, dict) or not all(
            k in relationships_data for k in ["summary", "relationships"]
        ):
            raise ValueError(
                "LLM output is not a dict or missing keys ('summary', 'relationships')"
            )
        if not isinstance(relationships_data["summary"], str):
            raise ValueError("summary is not a string")
        if not isinstance(relationships_data["relationships"], list):
            raise ValueError("relationships is not a list")

        # Validate relationships structure
        validated_relationships = []
        for rel in relationships_data["relationships"]:
            # Check for 'label' key
            if not isinstance(rel, dict) or not all(
                k in rel for k in ["from_abstraction", "to_abstraction", "label"]
            ):
                raise ValueError(
                    f"Missing keys (expected from_abstraction, to_abstraction, label) in relationship item: {rel}"
                )
            # Validate 'label' is a string
            if not isinstance(rel["label"], str):
                raise ValueError(f"Relationship label is not a string: {rel}")

            # Validate indices
            try:
                from_idx = int(str(rel["from_abstraction"]).split("#")[0].strip())
                to_idx = int(str(rel["to_abstraction"]).split("#")[0].strip())
                if not (
                    0 <= from_idx < num_abstractions and 0 <= to_idx < num_abstractions
                ):
                    raise ValueError(
                        f"Invalid index in relationship: from={from_idx}, to={to_idx}. Max index is {num_abstractions-1}."
                    )
                validated_relationships.append(
                    {
                        "from": from_idx,
                        "to": to_idx,
                        "label": rel["label"],  # Potentially translated label
                    }
                )
            except (ValueError, TypeError):
                raise ValueError(f"Could not parse indices from relationship: {rel}")

        print("Generated project summary and relationship details.")
        return {
            "summary": relationships_data["summary"],  # Potentially translated summary
            "details": validated_relationships,  # Store validated, index-based relationships with potentially translated labels
        }

    def post(self, shared, prep_res, exec_res):
        # Structure is now {"summary": str, "details": [{"from": int, "to": int, "label": str}]}
        # Summary and label might be translated
        shared["relationships"] = exec_res


class OrderChapters(Node):
    def prep(self, shared):
        abstractions = shared["abstractions"]  # Name/description might be translated
        relationships = shared["relationships"]  # Summary/label might be translated
        project_name = shared["project_name"]  # Get project name
        language = shared.get("language", "english")  # Get language
        use_cache = shared.get("use_cache", True)  # Get use_cache flag, default to True

        # Prepare context for the LLM
        abstraction_info_for_prompt = []
        for i, a in enumerate(abstractions):
            abstraction_info_for_prompt.append(
                f"- {i} # {a['name']}"
            )  # Use potentially translated name
        abstraction_listing = "\n".join(abstraction_info_for_prompt)

        # Use potentially translated summary and labels
        summary_note = ""
        if language.lower() != "english":
            summary_note = (
                f" (Note: Project Summary might be in {language.capitalize()})"
            )

        context = f"Project Summary{summary_note}:\n{relationships['summary']}\n\n"
        context += "Relationships (Indices refer to abstractions above):\n"
        for rel in relationships["details"]:
            from_name = abstractions[rel["from"]]["name"]
            to_name = abstractions[rel["to"]]["name"]
            # Use potentially translated 'label'
            context += f"- From {rel['from']} ({from_name}) to {rel['to']} ({to_name}): {rel['label']}\n"  # Label might be translated

        list_lang_note = ""
        if language.lower() != "english":
            list_lang_note = f" (Names might be in {language.capitalize()})"

        return (
            abstraction_listing,
            context,
            len(abstractions),
            project_name,
            list_lang_note,
            use_cache,
        )  # Return use_cache

    def exec(self, prep_res):
        (
            abstraction_listing,
            context,
            num_abstractions,
            project_name,
            list_lang_note,
            use_cache,
        ) = prep_res  # Unpack use_cache
        print("Determining chapter order using LLM...")
        # No language variation needed here in prompt instructions, just ordering based on structure
        # The input names might be translated, hence the note.
        prompt = f"""
Given the following project abstractions and their relationships for the project ```` {project_name} ````:

Abstractions (Index # Name){list_lang_note}:
{abstraction_listing}

Context about relationships and project summary:
{context}

If you are going to make a tutorial for ```` {project_name} ````, what is the best order to explain these abstractions, from first to last?
Ideally, first explain those that are the most important or foundational, perhaps user-facing concepts or entry points. Then move to more detailed, lower-level implementation details or supporting concepts.

Output the ordered list of abstraction indices, including the name in a comment for clarity. Use the format `idx # AbstractionName`.

```yaml
- 2 # FoundationalConcept
- 0 # CoreClassA
- 1 # CoreClassB (uses CoreClassA)
- ...
```

Now, provide the YAML output:
"""
        response = call_llm(prompt)

        # --- Validation ---
        yaml_str = response.strip().split("```yaml")[1].split("```")[0].strip()
        ordered_indices_raw = yaml.safe_load(yaml_str)

        if not isinstance(ordered_indices_raw, list):
            raise ValueError("LLM output is not a list")

        ordered_indices = []
        seen_indices = set()
        for entry in ordered_indices_raw:
            try:
                if isinstance(entry, int):
                    idx = entry
                elif isinstance(entry, str) and "#" in entry:
                    idx = int(entry.split("#")[0].strip())
                else:
                    idx = int(str(entry).strip())

                if not (0 <= idx < num_abstractions):
                    raise ValueError(
                        f"Invalid index {idx} in ordered list. Max index is {num_abstractions-1}."
                    )
                if idx in seen_indices:
                    raise ValueError(f"Duplicate index {idx} found in ordered list.")
                ordered_indices.append(idx)
                seen_indices.add(idx)

            except (ValueError, TypeError):
                raise ValueError(
                    f"Could not parse index from ordered list entry: {entry}"
                )

        # Check if all abstractions are included
        if len(ordered_indices) != num_abstractions:
            raise ValueError(
                f"Ordered list length ({len(ordered_indices)}) does not match number of abstractions ({num_abstractions}). Missing indices: {set(range(num_abstractions)) - seen_indices}"
            )

        print(f"Determined chapter order (indices): {ordered_indices}")
        return ordered_indices  # Return the list of indices

    def post(self, shared, prep_res, exec_res):
        # exec_res is already the list of ordered indices
        shared["chapter_order"] = exec_res  # List of indices


class WriteChapters(BatchNode):
    def prep(self, shared):
        chapter_order = shared["chapter_order"]  # List of indices
        abstractions = shared[
            "abstractions"
        ]  # List of {"name": str, "description": str, "files": [int]}
        files_data = shared["files"]  # List of (path, content) tuples
        project_name = shared["project_name"]
        language = shared.get("language", "english")
        use_cache = shared.get("use_cache", True)  # Get use_cache flag, default to True

        # Get already written chapters to provide context
        # We store them temporarily during the batch run, not in shared memory yet
        # The 'previous_chapters_summary' will be built progressively in the exec context
        self.chapters_written_so_far = (
            []
        )  # Use instance variable for temporary storage across exec calls

        # Create a complete list of all chapters
        all_chapters = []
        chapter_filenames = {}  # Store chapter filename mapping for linking
        for i, abstraction_index in enumerate(chapter_order):
            if 0 <= abstraction_index < len(abstractions):
                chapter_num = i + 1
                chapter_name = abstractions[abstraction_index][
                    "name"
                ]  # Potentially translated name
                # Create safe filename (from potentially translated name)
                safe_name = "".join(
                    c if c.isalnum() else "_" for c in chapter_name
                ).lower()
                filename = f"{i+1:02d}_{safe_name}.md"
                # Format with link (using potentially translated name)
                all_chapters.append(f"{chapter_num}. [{chapter_name}]({filename})")
                # Store mapping of chapter index to filename for linking
                chapter_filenames[abstraction_index] = {
                    "num": chapter_num,
                    "name": chapter_name,
                    "filename": filename,
                }

        # Create a formatted string with all chapters
        full_chapter_listing = "\n".join(all_chapters)

        items_to_process = []
        for i, abstraction_index in enumerate(chapter_order):
            if 0 <= abstraction_index < len(abstractions):
                abstraction_details = abstractions[
                    abstraction_index
                ]  # Contains potentially translated name/desc
                # Use 'files' (list of indices) directly
                related_file_indices = abstraction_details.get("files", [])
                # Get content using helper, passing indices
                related_files_content_map = get_content_for_indices(
                    files_data, related_file_indices
                )

                # Get previous chapter info for transitions (uses potentially translated name)
                prev_chapter = None
                if i > 0:
                    prev_idx = chapter_order[i - 1]
                    prev_chapter = chapter_filenames[prev_idx]

                # Get next chapter info for transitions (uses potentially translated name)
                next_chapter = None
                if i < len(chapter_order) - 1:
                    next_idx = chapter_order[i + 1]
                    next_chapter = chapter_filenames[next_idx]

                items_to_process.append(
                    {
                        "chapter_num": i + 1,
                        "abstraction_index": abstraction_index,
                        "abstraction_details": abstraction_details,  # Has potentially translated name/desc
                        "related_files_content_map": related_files_content_map,
                        "project_name": shared["project_name"],  # Add project name
                        "full_chapter_listing": full_chapter_listing,  # Add the full chapter listing (uses potentially translated names)
                        "chapter_filenames": chapter_filenames,  # Add chapter filenames mapping (uses potentially translated names)
                        "prev_chapter": prev_chapter,  # Add previous chapter info (uses potentially translated name)
                        "next_chapter": next_chapter,  # Add next chapter info (uses potentially translated name)
                        "language": language,  # Add language for multi-language support
                        # previous_chapters_summary will be added dynamically in exec
                    }
                )
            else:
                print(
                    f"Warning: Invalid abstraction index {abstraction_index} in chapter_order. Skipping."
                )

        print(f"Preparing to write {len(items_to_process)} chapters...")
        return items_to_process  # Iterable for BatchNode

    def exec(self, item):
        # This runs for each item prepared above
        abstraction_name = item["abstraction_details"][
            "name"
        ]  # Potentially translated name
        abstraction_description = item["abstraction_details"][
            "description"
        ]  # Potentially translated description
        chapter_num = item["chapter_num"]
        project_name = item.get("project_name")
        language = item.get("language", "english")
        print(f"Writing chapter {chapter_num} for: {abstraction_name} using LLM...")

        # Prepare file context string from the map - limit size if too large
        file_contexts = []
        for idx_path, content in item["related_files_content_map"].items():
            header = f"--- File: {idx_path.split('# ')[1] if '# ' in idx_path else idx_path} ---"
            # Limit each file context to max 500 characters
            if len(content) > 500:
                content = content[:250] + "\n...[content truncated]...\n" + content[-250:]
            file_contexts.append(f"{header}\n{content}")
        
        # Join contexts with max entries
        max_file_contexts = 5
        if len(file_contexts) > max_file_contexts:
            file_context_str = "\n\n".join(file_contexts[:max_file_contexts]) + "\n\n[Additional files truncated]"
        else:
            file_context_str = "\n\n".join(file_contexts)

        # Get summary of chapters written *before* this one - limit to most recent chapters only
        # Use only the most recent chapter for context to avoid excess tokens
        if len(self.chapters_written_so_far) > 0:
            # Just use the most recent chapter, truncated if necessary
            latest_chapter = self.chapters_written_so_far[-1]
            if len(latest_chapter) > 1000:  # Limit to ~1000 characters
                previous_chapters_summary = latest_chapter[:500] + "\n...[content truncated]...\n" + latest_chapter[-500:]
            else:
                previous_chapters_summary = latest_chapter
        else:
            previous_chapters_summary = ""

        # Add language instruction and context notes only if not English
        language_instruction = ""
        concept_details_note = ""
        structure_note = ""
        prev_summary_note = ""
        instruction_lang_note = ""
        mermaid_lang_note = ""
        code_comment_note = ""
        link_lang_note = ""
        tone_note = ""
        if language.lower() != "english":
            lang_cap = language.capitalize()
            language_instruction = f"IMPORTANT: Write this ENTIRE tutorial chapter in **{lang_cap}**. Some input context (like concept name, description, chapter list, previous summary) might already be in {lang_cap}, but you MUST translate ALL other generated content including explanations, examples, technical terms, and potentially code comments into {lang_cap}. DO NOT use English anywhere except in code syntax, required proper nouns, or when specified. The entire output MUST be in {lang_cap}.\n\n"
            concept_details_note = f" (Note: Provided in {lang_cap})"
            structure_note = f" (Note: Chapter names might be in {lang_cap})"
            prev_summary_note = f" (Note: This summary might be in {lang_cap})"
            instruction_lang_note = f" (in {lang_cap})"
            mermaid_lang_note = f" (Use {lang_cap} for labels/text if appropriate)"
            code_comment_note = f" (Translate to {lang_cap} if possible, otherwise keep minimal English for clarity)"
            link_lang_note = (
                f" (Use the {lang_cap} chapter title from the structure above)"
            )
            tone_note = f" (appropriate for {lang_cap} readers)"

        prompt = f"""
{language_instruction}Write a very beginner-friendly tutorial chapter (in Markdown format) for the project `{project_name}` about the concept: "{abstraction_name}". This is Chapter {chapter_num}.

Concept Details{concept_details_note}:
- Name: {abstraction_name}
- Description:
{abstraction_description}

Complete Tutorial Structure{structure_note}:
{item["full_chapter_listing"]}

Context from previous chapters{prev_summary_note}:
{previous_chapters_summary if previous_chapters_summary else "This is the first chapter."}

Relevant Code Snippets (Code itself remains unchanged):
{file_context_str if file_context_str else "No specific code snippets provided for this abstraction."}

Instructions for the chapter (Generate content in {language.capitalize()} unless specified otherwise):
- Start with a clear heading (e.g., `# Chapter {chapter_num}: {abstraction_name}`). Use the provided concept name.

- If this is not the first chapter, begin with a brief transition from the previous chapter{instruction_lang_note}, referencing it with a proper Markdown link using its name{link_lang_note}.

- Begin with a high-level motivation explaining what problem this abstraction solves{instruction_lang_note}. Start with a central use case as a concrete example. The whole chapter should guide the reader to understand how to solve this use case. Make it very minimal and friendly to beginners.

- If the abstraction is complex, break it down into key concepts. Explain each concept one-by-one in a very beginner-friendly way{instruction_lang_note}.

- Explain how to use this abstraction to solve the use case{instruction_lang_note}. Give example inputs and outputs for code snippets (if the output isn't values, describe at a high level what will happen{instruction_lang_note}).

- Each code block should be BELOW 10 lines! If longer code blocks are needed, break them down into smaller pieces and walk through them one-by-one. Aggresively simplify the code to make it minimal. Use comments{code_comment_note} to skip non-important implementation details. Each code block should have a beginner friendly explanation right after it{instruction_lang_note}.

- Describe the internal implementation to help understand what's under the hood{instruction_lang_note}. First provide a non-code or code-light walkthrough on what happens step-by-step when the abstraction is called{instruction_lang_note}. It's recommended to use a simple sequenceDiagram with a dummy example - keep it minimal with at most 5 participants to ensure clarity. If participant name has space, use: `participant QP as Query Processing`. {mermaid_lang_note}.

- Then dive deeper into code for the internal implementation with references to files. Provide example code blocks, but make them similarly simple and beginner-friendly. Explain{instruction_lang_note}.

- IMPORTANT: When you need to refer to other core abstractions covered in other chapters, ALWAYS use proper Markdown links like this: [Chapter Title](filename.md). Use the Complete Tutorial Structure above to find the correct filename and the chapter title{link_lang_note}. Translate the surrounding text.

- Use mermaid diagrams to illustrate complex concepts (```mermaid``` format). {mermaid_lang_note}.

- Heavily use analogies and examples throughout{instruction_lang_note} to help beginners understand.

- End the chapter with a brief conclusion that summarizes what was learned{instruction_lang_note} and provides a transition to the next chapter{instruction_lang_note}. If there is a next chapter, use a proper Markdown link: [Next Chapter Title](next_chapter_filename){link_lang_note}.

- Ensure the tone is welcoming and easy for a newcomer to understand{tone_note}.

- Output *only* the Markdown content for this chapter.

Now, directly provide a super beginner-friendly Markdown output (DON'T need ```markdown``` tags):
"""
        chapter_content = call_llm(prompt)
        # Basic validation/cleanup
        actual_heading = f"# Chapter {chapter_num}: {abstraction_name}"  # Use potentially translated name
        if not chapter_content.strip().startswith(f"# Chapter {chapter_num}"):
            # Add heading if missing or incorrect, trying to preserve content
            lines = chapter_content.strip().split("\n")
            if lines and lines[0].strip().startswith(
                "#"
            ):  # If there's some heading, replace it
                lines[0] = actual_heading
                chapter_content = "\n".join(lines)
            else:  # Otherwise, prepend it
                chapter_content = f"{actual_heading}\n\n{chapter_content}"

        # Add the generated content to our temporary list for the next iteration's context
        self.chapters_written_so_far.append(chapter_content)

        return chapter_content  # Return the Markdown string (potentially translated)

    def post(self, shared, prep_res, exec_res_list):
        # exec_res_list contains the generated Markdown for each chapter, in order
        shared["chapters"] = exec_res_list
        # Clean up the temporary instance variable
        del self.chapters_written_so_far
        print(f"Finished writing {len(exec_res_list)} chapters.")


class CombineTutorial(Node):
    def prep(self, shared):
        project_name = shared["project_name"]
        output_base_dir = shared.get("output_dir", "output")  # Default output dir
        output_path = os.path.join(output_base_dir, project_name)
        repo_url = shared.get("repo_url")  # Get the repository URL
        # language = shared.get("language", "english") # No longer needed for fixed strings

        # Get potentially translated data
        relationships_data = shared[
            "relationships"
        ]  # {"summary": str, "details": [{"from": int, "to": int, "label": str}]} -> summary/label potentially translated
        chapter_order = shared["chapter_order"]  # indices
        abstractions = shared[
            "abstractions"
        ]  # list of dicts -> name/description potentially translated
        chapters_content = shared[
            "chapters"
        ]  # list of strings -> content potentially translated

        # --- Generate Mermaid Diagram ---
        mermaid_lines = ["flowchart TD"]
        # Add nodes for each abstraction using potentially translated names
        for i, abstr in enumerate(abstractions):
            node_id = f"A{i}"
            # Use potentially translated name, sanitize for Mermaid ID and label
            sanitized_name = abstr["name"].replace('"', "")
            node_label = sanitized_name  # Using sanitized name only
            mermaid_lines.append(
                f'    {node_id}["{node_label}"]'
            )  # Node label uses potentially translated name
        # Add edges for relationships using potentially translated labels
        for rel in relationships_data["details"]:
            from_node_id = f"A{rel['from']}"
            to_node_id = f"A{rel['to']}"
            # Use potentially translated label, sanitize
            edge_label = (
                rel["label"].replace('"', "").replace("\n", " ")
            )  # Basic sanitization
            max_label_len = 30
            if len(edge_label) > max_label_len:
                edge_label = edge_label[: max_label_len - 3] + "..."
            mermaid_lines.append(
                f'    {from_node_id} -- "{edge_label}" --> {to_node_id}'
            )  # Edge label uses potentially translated label

        mermaid_diagram = "\n".join(mermaid_lines)
        # --- End Mermaid ---

        # --- Prepare index.md content ---
        index_content = f"# Tutorial: {project_name}\n\n"
        index_content += f"{relationships_data['summary']}\n\n"  # Use the potentially translated summary directly
        # Keep fixed strings in English
        index_content += f"**Source Repository:** [{repo_url}]({repo_url})\n\n"

        # Add Mermaid diagram for relationships (diagram itself uses potentially translated names/labels)
        index_content += "```mermaid\n"
        index_content += mermaid_diagram + "\n"
        index_content += "```\n\n"

        # Keep fixed strings in English
        index_content += f"## Chapters\n\n"

        chapter_files = []
        # Generate chapter links based on the determined order, using potentially translated names
        for i, abstraction_index in enumerate(chapter_order):
            # Ensure index is valid and we have content for it
            if 0 <= abstraction_index < len(abstractions) and i < len(chapters_content):
                abstraction_name = abstractions[abstraction_index][
                    "name"
                ]  # Potentially translated name
                # Sanitize potentially translated name for filename
                safe_name = "".join(
                    c if c.isalnum() else "_" for c in abstraction_name
                ).lower()
                filename = f"{i+1:02d}_{safe_name}.md"
                index_content += f"{i+1}. [{abstraction_name}]({filename})\n"  # Use potentially translated name in link text

                # Add attribution to chapter content (using English fixed string)
                chapter_content = chapters_content[i]  # Potentially translated content
                if not chapter_content.endswith("\n\n"):
                    chapter_content += "\n\n"
                # Keep fixed strings in English
                chapter_content += f"---\n\nGenerated by [CodeFlowAI]<My Git Repository>"

                # Store filename and corresponding content
                chapter_files.append({"filename": filename, "content": chapter_content})
            else:
                print(
                    f"Warning: Mismatch between chapter order, abstractions, or content at index {i} (abstraction index {abstraction_index}). Skipping file generation for this entry."
                )

        # Add attribution to index content (using English fixed string)
        index_content += f"\n\n---\n\nGenerated by [CodeFlowAI]<My Git Repository>"

        return {
            "output_path": output_path,
            "index_content": index_content,
            "chapter_files": chapter_files,  # List of {"filename": str, "content": str}
        }

    def exec(self, prep_res):
        output_path = prep_res["output_path"]
        index_content = prep_res["index_content"]
        chapter_files = prep_res["chapter_files"]

        print(f"Combining tutorial into directory: {output_path}")
        # Rely on Node's built-in retry/fallback
        os.makedirs(output_path, exist_ok=True)

        # Write index.md
        index_filepath = os.path.join(output_path, "index.md")
        with open(index_filepath, "w", encoding="utf-8") as f:
            f.write(index_content)
        print(f"  - Wrote {index_filepath}")

        # Write chapter files
        for chapter_info in chapter_files:
            chapter_filepath = os.path.join(output_path, chapter_info["filename"])
            with open(chapter_filepath, "w", encoding="utf-8") as f:
                f.write(chapter_info["content"])
            print(f"  - Wrote {chapter_filepath}")

        return output_path  # Return the final path

    def post(self, shared, prep_res, exec_res):
        shared["final_output_dir"] = exec_res  # Store the output path
        print(f"\nTutorial generation complete! Files are in: {exec_res}")


class CloudReadinessAnalysis(BatchNode):
    """Performs cloud readiness analysis on the codebase with progress updates"""
    
    def prep(self, shared):
        """
        Prepare files and project name for cloud analysis.
        Sets up status tracking and divides files into batches for processing.
        """
        use_llm = shared.get("use_llm_cloud_analysis", True)  # Default to True
        files_data = shared["files"]
        project_name = shared["project_name"]
        github_token = shared.get("github_token")
        job_id = shared.get("job_id")
        
        # Set up logging
        self.logger = get_logger('cloud_analysis')
        self.logger.info(f"Starting cloud readiness analysis for project: {project_name}")
        self.logger.info(f"Analysis options: use_llm={use_llm}, files_count={len(files_data)}")
        
        # Initialize status updater if job_id is provided
        if job_id and 'jobs' in shared:
            self.logger.info(f"Using status updater for job {job_id}")
            self.status_updater = StatusUpdater(job_id, shared['jobs'])
            
            # Define the processing phases
            phases = [
                "setup", 
                "language_detection",
                "secrets_check",
                "architecture_analysis",
                "component_analysis",
                "llm_analysis", 
                "score_calculation",
                "recommendation_generation"
            ]
            self.status_updater.set_phases(phases)
            
            # Start with setup phase
            self.status_updater.update_phase("setup", "Initializing cloud readiness analysis")
        else:
            self.logger.info("No job ID provided, running without status updates")
            self.status_updater = None
            
        # Store basic parameters for use in exec and post
        self.use_llm = use_llm
        self.project_name = project_name
        self.github_token = github_token
            
        # Divide files into manageable batches for processing
        # Using a reasonable batch size to provide granular progress updates
        batch_size = 50
        file_batches = []
        
        for i in range(0, len(files_data), batch_size):
            batch = files_data[i:i+batch_size]
            file_batches.append(batch)
        
        batch_count = len(file_batches)
        total_files = len(files_data)
        self.logger.info(f"Divided {total_files} files into {batch_count} batches (batch size: {batch_size})")
            
        if self.status_updater:
            self.status_updater.set_phase_items(batch_count, f"Processing {total_files} files in {batch_count} batches")
            
        return file_batches
        
    def exec(self, file_batch):
        """
        Process a batch of files for cloud readiness analysis
        
        Args:
            file_batch: A batch of files to analyze
            
        Returns:
            Partial results for this batch of files
        """
        # Import here so it's available in the exec method
        from utils.cloud_analyzer import detect_language_frameworks, check_hardcoded_secrets, analyze_architecture
        from utils.cloud_analyzer import check_environment_variables, analyze_service_coupling, analyze_logging_practices
        from utils.cloud_analyzer import analyze_state_management, analyze_code_modularity, analyze_dependency_management
        from utils.cloud_analyzer import detect_health_check_endpoints, analyze_testing_coverage, analyze_instrumentation
        
        # Process this batch of files
        batch_results = {}
        batch_size = len(file_batch)
        self.logger.info(f"Processing batch of {batch_size} files")
        
        # Language and framework detection
        if self.status_updater:
            self.status_updater.update_phase("language_detection", "Detecting programming languages and frameworks")
        
        self.logger.info("Detecting languages and frameworks")
        tech_analysis = detect_language_frameworks(file_batch)
        batch_results["tech_analysis"] = tech_analysis
        
        # Log detected languages and frameworks
        languages = tech_analysis.get("languages", {})
        frameworks = tech_analysis.get("frameworks", {})
        if languages:
            lang_str = ", ".join([f"{lang}:{count}" for lang, count in languages.items()])
            self.logger.info(f"Detected languages: {lang_str}")
        if frameworks:
            fw_str = ", ".join([f"{fw}:{count}" for fw, count in frameworks.items()])
            self.logger.info(f"Detected frameworks: {fw_str}")
        
        # Secrets check
        if self.status_updater:
            self.status_updater.update_phase("secrets_check", "Checking for hardcoded secrets")
        
        self.logger.info("Checking for hardcoded secrets")
        secrets_analysis = check_hardcoded_secrets(file_batch)
        batch_results["secrets_analysis"] = secrets_analysis
        
        # Log secrets findings
        secret_count = secrets_analysis.get("secrets_count", 0)
        self.logger.info(f"Found {secret_count} potential secrets in this batch")
        
        # Environment variables
        self.logger.info("Analyzing environment variables usage")
        env_vars_analysis = check_environment_variables(file_batch)
        batch_results["env_vars_analysis"] = env_vars_analysis
        
        # Log env vars findings
        env_vars_count = env_vars_analysis.get("count", 0)
        self.logger.info(f"Found {env_vars_count} environment variable references in this batch")
        
        # Component analysis (update status for each component)
        if self.status_updater:
            self.status_updater.update_phase("component_analysis", "Analyzing code components")
            components_total = 6  # Number of component analyses
            self.status_updater.set_phase_items(components_total)
        
        self.logger.info("Starting component analysis")
        
        # Service coupling
        self.logger.info("Analyzing service coupling")
        coupling_analysis = analyze_service_coupling(file_batch)
        batch_results["coupling_analysis"] = coupling_analysis
        if self.status_updater:
            self.status_updater.increment_progress(1, "Analyzed service coupling")
        
        # Logging practices
        self.logger.info("Analyzing logging practices")
        logging_analysis = analyze_logging_practices(file_batch)
        batch_results["logging_analysis"] = logging_analysis
        if self.status_updater:
            self.status_updater.increment_progress(1, "Analyzed logging practices")
        
        # State management
        self.logger.info("Analyzing state management")
        state_management = analyze_state_management(file_batch)
        batch_results["state_management"] = state_management
        if self.status_updater:
            self.status_updater.increment_progress(1, "Analyzed state management")
        
        # Code modularity
        self.logger.info("Analyzing code modularity")
        modularity_analysis = analyze_code_modularity(file_batch)
        batch_results["modularity_analysis"] = modularity_analysis
        if self.status_updater:
            self.status_updater.increment_progress(1, "Analyzed code modularity")
        
        # Dependency management
        self.logger.info("Analyzing dependency management")
        dependency_analysis = analyze_dependency_management(file_batch)
        batch_results["dependency_analysis"] = dependency_analysis
        if self.status_updater:
            self.status_updater.increment_progress(1, "Analyzed dependency management")
        
        # Health checks, testing, and instrumentation
        self.logger.info("Analyzing health checks, testing, and instrumentation")
        health_check_analysis = detect_health_check_endpoints(file_batch)
        testing_analysis = analyze_testing_coverage(file_batch)
        instrumentation_analysis = analyze_instrumentation(file_batch)
        
        batch_results["health_check_analysis"] = health_check_analysis
        batch_results["testing_analysis"] = testing_analysis
        batch_results["instrumentation_analysis"] = instrumentation_analysis
        
        if self.status_updater:
            self.status_updater.increment_progress(1, "Completed component analysis")
            
        self.logger.info("Completed batch analysis")
        
        # Return partial results for this batch
        return batch_results
        
    def post(self, shared, prep_res, exec_res_list):
        """
        Combine batch results and generate final analysis
        
        Args:
            shared: Shared data store
            prep_res: Output from prep (list of file batches)
            exec_res_list: List of batch results from exec
        """
        from utils.cloud_analyzer import analyze_architecture, analyze_cloud_readiness_with_llm
        from utils.cloud_analyzer import calculate_cloud_readiness_scores, generate_recommendations
        import os
        import json
        
        batch_count = len(exec_res_list)
        file_count = sum(len(batch) for batch in prep_res)
        self.logger.info(f"Combining results from {batch_count} batches (total files: {file_count})")
        
        # Start with architecture analysis phase
        if self.status_updater:
            self.status_updater.update_phase("architecture_analysis", "Analyzing application architecture")
        
        # Combine results from all batches
        tech_analysis = {"languages": {}, "frameworks": {}, "databases": {}, "cloud_services": {}, "containerization": {}, "cicd": {}, "monitoring": {}, "iac": {}, "files": shared["files"]}
        secrets_analysis = {"has_secrets": False, "secrets_count": 0, "files_with_secrets": []}
        env_vars_analysis = {"count": 0, "variables": set(), "files": []}
        coupling_analysis = {"count": 0, "services": {}}
        logging_analysis = {"has_logging": False, "logging_count": 0, "files_with_logging": [], "structured_logging": 0, "basic_logging": 0, "log_levels": 0, "files": []}
        state_management = {"has_state_mgmt": False, "state_count": 0, "files_with_state": [], "stateless": 0, "persistent_state": 0, "database_state": 0, "files": []}
        modularity_analysis = {"modularity_score": 0, "component_count": 0, "files_by_component": {}}
        dependency_analysis = {"has_dependency_mgmt": False, "dependency_files": []}
        health_check_analysis = {"has_health_endpoints": False, "count": 0, "health_endpoints": [], "files": []}
        testing_analysis = {"has_tests": False, "test_count": 0, "test_files": [], "unit_tests": 0, "integration_tests": 0, "mocking": 0, "files": []}
        instrumentation_analysis = {"has_instrumentation": False, "instrumentation_count": 0, "files_with_instrumentation": [], "metrics": 0, "tracing": 0, "profiling": 0, "files": []}
        
        self.logger.info("Merging batch results")
        
        # Process and merge each batch result
        for i, batch_result in enumerate(exec_res_list):
            self.logger.info(f"Merging batch {i+1}/{batch_count}")
            
            # Merge tech analysis
            for tech_category in ["languages", "frameworks", "databases", "cloud_services", "containerization", "cicd", "monitoring", "iac"]:
                if tech_category in batch_result.get("tech_analysis", {}):
                    self.logger.debug(f"Merging {tech_category} from batch {i+1}")
                    for item, count in batch_result["tech_analysis"][tech_category].items():
                        tech_analysis[tech_category][item] = tech_analysis[tech_category].get(item, 0) + count
            
            # Merge secrets analysis
            secrets_result = batch_result.get("secrets_analysis", {})
            if secrets_result.get("has_secrets", False):
                secrets_analysis["has_secrets"] = True
                self.logger.debug(f"Batch {i+1} has secrets")
            secret_count = secrets_result.get("secrets_count", 0)
            if secret_count > 0:
                self.logger.debug(f"Batch {i+1} has {secret_count} potential secrets")
            secrets_analysis["secrets_count"] += secret_count
            secrets_analysis["files_with_secrets"].extend(secrets_result.get("files_with_secrets", []))
            
            # Merge environment variables analysis
            env_result = batch_result.get("env_vars_analysis", {})
            env_vars_count = env_result.get("count", 0)
            if env_vars_count > 0:
                self.logger.debug(f"Batch {i+1} has {env_vars_count} environment variables")
            env_vars_analysis["count"] += env_vars_count
            env_vars_analysis["variables"].update(env_result.get("variables", set()))
            env_vars_analysis["files"].extend(env_result.get("files", []))
            
            # Merge service coupling analysis
            coupling_result = batch_result.get("coupling_analysis", {})
            coupling_count = coupling_result.get("count", 0)
            if coupling_count > 0:
                self.logger.debug(f"Batch {i+1} has {coupling_count} service couplings")
            coupling_analysis["count"] += coupling_count
            for service, details in coupling_result.get("services", {}).items():
                if service not in coupling_analysis["services"]:
                    coupling_analysis["services"][service] = details
                else:
                    # Ensure both values are dictionaries before merging
                    if isinstance(coupling_analysis["services"][service], dict) and isinstance(details, dict):
                        # Merge details
                        self._merge_analysis(coupling_analysis["services"][service], details)
                    elif isinstance(details, dict):
                        # If target is not a dict but the source is, replace with the source
                        self.logger.warning(f"Type mismatch in coupling_analysis: service {service} is {type(coupling_analysis['services'][service])}, not dict. Replacing with source.")
                        coupling_analysis["services"][service] = details
                    elif isinstance(coupling_analysis["services"][service], dict):
                        # If source is not a dict but the target is, do nothing or add details as a special key
                        self.logger.warning(f"Type mismatch in coupling_analysis: details for service {service} is {type(details)}, not dict. Adding as 'raw_data'.")
                        coupling_analysis["services"][service]["raw_data"] = details
                    else:
                        # If neither is a dict, warn and skip
                        self.logger.warning(f"Both target and source are not dictionaries for service {service}. Target: {type(coupling_analysis['services'][service])}, Source: {type(details)}. Skipping merge.")
            
            # Merge logging analysis
            logging_result = batch_result.get("logging_analysis", {})
            if logging_result.get("has_logging", False):
                logging_analysis["has_logging"] = True
                self.logger.debug(f"Batch {i+1} has logging")
            logging_count = logging_result.get("logging_count", 0)
            if logging_count > 0:
                self.logger.debug(f"Batch {i+1} has {logging_count} logging instances")
            logging_analysis["logging_count"] += logging_count
            logging_analysis["files_with_logging"].extend(logging_result.get("files_with_logging", []))
            
            # Merge other analyses
            self._merge_analysis(state_management, batch_result.get("state_management", {}))
            self._merge_analysis(modularity_analysis, batch_result.get("modularity_analysis", {}))
            self._merge_analysis(dependency_analysis, batch_result.get("dependency_analysis", {}))
            self._merge_analysis(health_check_analysis, batch_result.get("health_check_analysis", {}))
            self._merge_analysis(testing_analysis, batch_result.get("testing_analysis", {}))
            self._merge_analysis(instrumentation_analysis, batch_result.get("instrumentation_analysis", {}))
        
        # Convert sets to lists for JSON serialization
        env_vars_analysis["variables"] = list(env_vars_analysis["variables"])
        
        # Log the final counts
        self.logger.info(f"Merged {batch_count} batches. Found:")
        self.logger.info(f"- {len(tech_analysis['languages'])} languages")
        self.logger.info(f"- {len(tech_analysis['frameworks'])} frameworks")
        self.logger.info(f"- {secrets_analysis['secrets_count']} potential secrets")
        self.logger.info(f"- {env_vars_analysis['count']} environment variables")
        self.logger.info(f"- {logging_analysis['logging_count']} logging instances")
        
        # Perform architecture analysis with the combined results
        self.logger.info("Analyzing architecture patterns")
        
        # Ensure all required keys exist in tech_analysis
        required_keys = ["languages", "frameworks", "databases", "cloud_services", 
                         "containerization", "cicd", "monitoring", "iac"]
        for key in required_keys:
            if key not in tech_analysis:
                self.logger.warning(f"Key '{key}' missing in tech_analysis, adding empty dictionary")
                tech_analysis[key] = {}
                
        architecture = analyze_architecture(tech_analysis)
        
        # Log architecture analysis results
        if architecture:
            arch_patterns = architecture.get("patterns", [])
            self.logger.info(f"Detected {len(arch_patterns)} architecture patterns: {', '.join(arch_patterns)}")
        
        # Perform LLM-based analysis if requested
        llm_analysis = None
        if self.use_llm:
            if self.status_updater:
                self.status_updater.update_phase("llm_analysis", "Performing LLM-based analysis")
            
            self.logger.info("Starting LLM-based analysis")
            try:
                self.logger.info("Calling LLM for cloud readiness analysis")
                llm_analysis = analyze_cloud_readiness_with_llm(shared["files"], self.project_name)
                
                # Log LLM results
                if llm_analysis:
                    key_strengths = llm_analysis.get("key_strengths", [])
                    key_weaknesses = llm_analysis.get("key_weaknesses", [])
                    self.logger.info(f"LLM analysis complete: found {len(key_strengths)} strengths and {len(key_weaknesses)} weaknesses")
                    
                    if self.status_updater:
                        self.status_updater.update_detailed_status("llm_strengths", len(key_strengths))
                        self.status_updater.update_detailed_status("llm_weaknesses", len(key_weaknesses))
            except Exception as e:
                error_msg = f"Error in LLM analysis: {str(e)}"
                self.logger.error(error_msg)
                if self.status_updater:
                    self.status_updater.update_detailed_status("llm_error", str(e))
        else:
            self.logger.info("Skipping LLM-based analysis (disabled)")
        
        # Calculate cloud readiness scores
        if self.status_updater:
            self.status_updater.update_phase("score_calculation", "Calculating readiness scores")
        
        self.logger.info("Calculating cloud readiness scores")
        rule_based_scores = calculate_cloud_readiness_scores(
            tech_analysis, 
            secrets_analysis, 
            architecture,
            env_vars_analysis,
            coupling_analysis,
            logging_analysis,
            state_management,
            modularity_analysis,
            dependency_analysis,
            health_check_analysis,
            testing_analysis,
            instrumentation_analysis
        )
        
        # Log rule-based scores
        self.logger.info(f"Rule-based overall score: {rule_based_scores.get('overall', 0):.2f}")
        
        # Combine scores if LLM analysis is available
        scores = rule_based_scores
        if llm_analysis and self.use_llm:
            self.logger.info("Combining rule-based and LLM-based scores")
            
            # Import the score map
            from utils.cloud_analyzer import max_score_map
            
            # Convert LLM scores to our scale
            llm_scores = {}
            for factor, data in llm_analysis["factors"].items():
                # Skip factors not in our scoring system
                if factor not in max_score_map:
                    continue
                
                # Convert from 1-10 to our scale
                if isinstance(data, dict) and "score" in data:
                    max_score = max_score_map.get(factor, 10)
                    normalized_score = (data["score"] / 10) * max_score
                    llm_scores[factor] = normalized_score
            
            # Blend scores (60% rule-based, 40% LLM-based)
            blended_scores = {}
            for factor in rule_based_scores:
                if factor in llm_scores:
                    raw_blended = 0.6 * rule_based_scores[factor] + 0.4 * llm_scores[factor]
                    # Cap at maximum score for this factor
                    max_score = max_score_map.get(factor, 10)
                    blended_scores[factor] = min(raw_blended, max_score)
                else:
                    # Also cap rule-based scores at their maximum
                    max_score = max_score_map.get(factor, 10)
                    blended_scores[factor] = min(rule_based_scores[factor], max_score)
            
            # Calculate overall score
            overall_sum = sum([blended_scores[f] for f in blended_scores if f != 'overall'])
            
            # Normalize to 0-100 range
            total_possible_score = sum(max_score_map.values())
            blended_scores['overall'] = max(0, min(round((overall_sum / total_possible_score) * 100), 100))
            
            # Use the blended scores
            scores = blended_scores
            
            # Log blended scores
            self.logger.info(f"Blended overall score: {scores.get('overall', 0):.2f}")
        
        # Determine readiness level based on overall score
        readiness_level = "Unknown"
        if scores['overall'] >= 80:
            readiness_level = "Cloud-Native"
        elif scores['overall'] >= 60:
            readiness_level = "Cloud-Ready"
        elif scores['overall'] >= 40:
            readiness_level = "Cloud-Friendly"
        else:
            readiness_level = "Cloud-Challenged"
        
        self.logger.info(f"Determined readiness level: {readiness_level}")
        
        # Generate recommendations
        if self.status_updater:
            self.status_updater.update_phase("recommendation_generation", "Generating recommendations")
        
        self.logger.info("Generating improvement recommendations")
        recommendations = generate_recommendations(
            tech_analysis, 
            secrets_analysis, 
            architecture, 
            scores,
            env_vars_analysis,
            coupling_analysis,
            logging_analysis,
            state_management,
            modularity_analysis,
            dependency_analysis,
            health_check_analysis,
            testing_analysis,
            instrumentation_analysis
        )
        
        self.logger.info(f"Generated {len(recommendations)} recommendations")
        
        # Create the final report
        self.logger.info("Assembling final report")
        report = {
            'technology_stack': tech_analysis,
            'architecture': architecture,
            'secrets': secrets_analysis,
            'environment_variables': env_vars_analysis,
            'service_coupling': coupling_analysis,
            'logging_practices': logging_analysis,
            'state_management': state_management,
            'code_modularity': modularity_analysis,
            'dependency_management': dependency_analysis,
            'health_checks': health_check_analysis,
            'testing_coverage': testing_analysis,
            'instrumentation': instrumentation_analysis,
            'scores': scores,
            'overall_score': scores['overall'],
            'readiness_level': readiness_level,
            'recommendations': recommendations
        }
        
        # Add LLM analysis if available
        if llm_analysis and self.use_llm:
            self.logger.info("Adding LLM analysis to report")
            # Add relevant parts of LLM analysis
            report['llm_analysis'] = {
                'summary': llm_analysis.get('summary', ''),
                'key_strengths': llm_analysis.get('key_strengths', []),
                'key_weaknesses': llm_analysis.get('key_weaknesses', []),
                'factors': llm_analysis.get('factors', {}),
            }
            # Add LLM recommendations to our rule-based ones
            llm_recs_count = 0
            for factor, data in llm_analysis.get('factors', {}).items():
                if isinstance(data, dict) and 'recommendations' in data:
                    # Create a new recommendation from LLM insight
                    llm_rec = {
                        'category': factor,
                        'priority': 'medium',
                        'description': data['recommendations'],
                        'source': 'llm'
                    }
                    report['recommendations'].append(llm_rec)
                    llm_recs_count += 1
            
            self.logger.info(f"Added {llm_recs_count} LLM-based recommendations")
        
        # Store output in shared dictionary
        shared["cloud_analysis"] = report
        
        # Create output directory
        output_dir = os.path.join(shared["output_dir"], self.project_name)
        shared["final_output_dir"] = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        # Save the cloud readiness analysis to the output directory
        json_path = os.path.join(output_dir, "cloud_readiness.json")
        self.logger.info(f"Saving cloud readiness analysis to {json_path}")
        with open(json_path, "w") as f:
            json.dump(report, f, indent=2)
            
        print(f"Cloud readiness analysis saved to {output_dir}/cloud_readiness.json")
        self.logger.info(f"Analysis complete for project {self.project_name}")
        
        # Complete the status tracking
        if self.status_updater:
            self.status_updater.update_detailed_status("readiness_level", readiness_level)
            self.status_updater.update_detailed_status("overall_score", scores['overall'])
            self.status_updater.update_detailed_status("recommendations_count", len(recommendations))
            self.status_updater.complete(True)
            
        return "default"
    
    def _merge_analysis(self, target, source):
        """Helper method to merge analysis dictionaries"""
        # If source is a list, we can't call items() on it
        if isinstance(source, list):
            self.logger.warning(f"Source is a list in _merge_analysis, not a dictionary. This is unexpected behavior.")
            # If target is also a list, extend it
            if isinstance(target, list):
                target.extend(source)
                self.logger.debug(f"Extended target list with {len(source)} items from source list")
            # If target is not a list, replace it with source
            else:
                self.logger.warning(f"Type mismatch in _merge_analysis: target is {type(target)}, source is list. Replacing target with source.")
                return source
            return target
            
        # Process dictionary as before
        for key, value in source.items():
            if isinstance(value, dict):
                if key not in target:
                    target[key] = {}
                    self.logger.debug(f"Created new dictionary for key {key}")
                elif not isinstance(target[key], dict):
                    self.logger.warning(f"Type mismatch in _merge_analysis: target[{key}] is {type(target[key])}, not dict")
                    target[key] = {}
                self._merge_analysis(target[key], value)
            elif isinstance(value, list):
                if key not in target:
                    target[key] = []
                    self.logger.debug(f"Created new list for key {key}")
                elif not isinstance(target[key], list):
                    self.logger.warning(f"Type mismatch in _merge_analysis: target[{key}] is {type(target[key])}, not list")
                    # Convert to list with existing value as first element if not already a list
                    target[key] = [target[key]]
                # Only extend lists, don't try to add them
                target[key].extend(value)
                self.logger.debug(f"Extended list for key {key} with {len(value)} items")
            elif isinstance(value, (int, float)):
                # For numeric values, we'll add them
                if key not in target:
                    target[key] = value
                    self.logger.debug(f"Created new numeric value for key {key}: {value}")
                elif isinstance(target[key], (int, float)):
                    # If both are numeric, add them
                    target[key] = target[key] + value
                    self.logger.debug(f"Added numeric value to key {key}: {target[key]}")
                elif isinstance(target[key], list):
                    # If target is a list, append the numeric value
                    self.logger.warning(f"Type mismatch in _merge_analysis: trying to add {type(value)} to list for key {key}")
                    target[key].append(value)
                    self.logger.debug(f"Appended numeric value to list for key {key}")
                else:
                    # Handle other type mismatches
                    self.logger.warning(f"Type mismatch in _merge_analysis: cannot add {type(value)} to {type(target[key])} for key {key}")
                    # Convert both to strings and concatenate as a fallback
                    target[key] = str(target[key]) + " | " + str(value)
            elif isinstance(value, bool):
                # For boolean values, use OR operation
                if key not in target:
                    target[key] = value
                    self.logger.debug(f"Created new boolean value for key {key}: {value}")
                elif isinstance(target[key], bool):
                    target[key] = target[key] or value
                    self.logger.debug(f"Applied OR operation for boolean key {key}: {target[key]}")
                else:
                    self.logger.warning(f"Type mismatch in _merge_analysis: cannot apply OR to {type(target[key])} for key {key}")
                    # Just override with the boolean value
                    target[key] = value
            else:
                # For other values, just override
                if key in target and type(target[key]) != type(value):
                    self.logger.debug(f"Overriding different type for key {key}: {type(target[key])} -> {type(value)}")
                target[key] = value
        return target

# Add a helper max score map for the scores
max_score_map = {
    "language_compatibility": 15,
    "containerization": 15,
    "ci_cd": 10,
    "configuration": 10,
    "cloud_integration": 10,
    "service_coupling": 5,
    "logging_practices": 5,
    "state_management": 5,
    "code_modularity": 5,
    "dependency_management": 5,
    "health_checks": 5,
    "testing": 5,
    "instrumentation": 5,
    "infrastructure_as_code": 5
}
