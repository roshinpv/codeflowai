import os
import fnmatch
import pathspec


def crawl_local_files(
    directory,
    include_patterns=None,
    exclude_patterns=None,
    max_file_size=None,
    use_relative_paths=True,
):
    """
    Crawl files in a local directory with similar interface as crawl_github_files.
    Args:
        directory (str): Path to local directory
        include_patterns (set): File patterns to include (e.g. {"*.py", "*.js"})
        exclude_patterns (set): File patterns to exclude (e.g. {"tests/*"})
        max_file_size (int): Maximum file size in bytes
        use_relative_paths (bool): Whether to use paths relative to directory

    Returns:
        dict: {"files": {filepath: content}}
    """
    if not os.path.isdir(directory):
        raise ValueError(f"Directory does not exist: {directory}")

    files_dict = {}

    # --- Load .gitignore ---
    gitignore_path = os.path.join(directory, ".gitignore")
    gitignore_spec = None
    if os.path.exists(gitignore_path):
        try:
            with open(gitignore_path, "r", encoding="utf-8") as f:
                gitignore_patterns = f.readlines()
            gitignore_spec = pathspec.PathSpec.from_lines(
                "gitwildmatch", gitignore_patterns
            )
            print(f"Loaded .gitignore patterns from {gitignore_path}")
        except Exception as e:
            print(
                f"Warning: Could not read or parse .gitignore file {gitignore_path}: {e}"
            )
    # --- End Load .gitignore ---

    # Debug print
    # print(f"Include patterns: {include_patterns}")
    # print(f"Exclude patterns: {exclude_patterns}")

    for root, dirs, files in os.walk(directory):
        # Filter directories using .gitignore and exclude_patterns early to avoid descending
        # Need to process dirs list *in place* for os.walk to respect it
        excluded_dirs = set()
        for d in dirs:
            dirpath_rel = os.path.relpath(os.path.join(root, d), directory)

            # Check against .gitignore (important for directories)
            if gitignore_spec and gitignore_spec.match_file(dirpath_rel):
                excluded_dirs.add(d)
                continue  # Skip further checks if gitignored

            # Check against standard exclude_patterns
            if exclude_patterns:
                for pattern in exclude_patterns:
                    # Match pattern against full relative path or directory name itself
                    pattern_matches = (
                        fnmatch.fnmatch(dirpath_rel, pattern) or 
                        fnmatch.fnmatch(d, pattern) or
                        # Handle double-star patterns
                        (pattern.startswith("**/") and fnmatch.fnmatch(dirpath_rel, pattern[3:]))
                    )
                    if pattern_matches:
                        excluded_dirs.add(d)
                        break

        # Modify dirs in-place: remove excluded ones
        # Iterate over a copy (.copy()) because we are modifying the list during iteration
        for d in dirs.copy():
            if d in excluded_dirs:
                dirs.remove(d)

        # Now process files in the non-excluded directories
        for filename in files:
            filepath = os.path.join(root, filename)

            # Get path relative to directory if requested
            if use_relative_paths:
                relpath = os.path.relpath(filepath, directory)
            else:
                relpath = filepath

            # --- Exclusion check ---
            excluded = False
            # 1. Check .gitignore first
            if gitignore_spec and gitignore_spec.match_file(relpath):
                excluded = True
                # print(f"Excluded by gitignore: {relpath}")

            # 2. Check standard exclude_patterns if not already excluded by .gitignore
            if not excluded and exclude_patterns:
                for pattern in exclude_patterns:
                    if (fnmatch.fnmatch(relpath, pattern) or
                        (pattern.startswith("**/") and fnmatch.fnmatch(relpath, pattern[3:]))):
                        excluded = True
                        # print(f"Excluded by pattern {pattern}: {relpath}")
                        break

            # --- Inclusion check ---
            included = False
            if include_patterns:
                for pattern in include_patterns:
                    # Multiple ways to match the pattern
                    if (fnmatch.fnmatch(relpath, pattern) or  # Full path match
                        fnmatch.fnmatch(filename, pattern) or  # Just filename match
                        # Special handling for directory-based patterns like **/src/**/*.java
                        (pattern.startswith("**/") and fnmatch.fnmatch(relpath, pattern[3:])) or
                        # Try with just the extension for *.ext type patterns
                        (pattern.startswith("*.") and filename.endswith(pattern[1:])) or
                        # Handle patterns like **/src/**/*
                        (pattern.endswith("/*") and relpath.startswith(pattern[:-1]))):
                        included = True
                        # print(f"Included by pattern {pattern}: {relpath}")
                        break
            else:
                # If no include patterns, include everything *not excluded*
                included = True

            # Skip if not included or if excluded (by either method)
            if not included or excluded:
                # print(f"Skipping {relpath}: included={included}, excluded={excluded}")
                continue

            # Check file size
            if max_file_size and os.path.getsize(filepath) > max_file_size:
                # print(f"Skipping {relpath}: size {os.path.getsize(filepath)} exceeds limit {max_file_size}")
                continue

            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                files_dict[relpath] = content
                # print(f"Added {relpath}")
            except Exception as e:
                print(f"Warning: Could not read file {filepath}: {e}")

    return {"files": files_dict}


if __name__ == "__main__":
    print("--- Crawling parent directory ('..') ---")
    files_data = crawl_local_files(
        "..",
        exclude_patterns={
            "*.pyc",
            "__pycache__/*",
            ".venv/*",
            ".git/*",
            "docs/*",
            "output/*",
        },
    )
    print(f"Found {len(files_data['files'])} files:")
    for path in files_data["files"]:
        print(f"  {path}")
