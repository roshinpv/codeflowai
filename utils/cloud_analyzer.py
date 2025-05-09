import os
import re
import json

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

def detect_language_frameworks(files_data):
    """Detect programming languages and frameworks used in the codebase."""
    languages = {}
    frameworks = {}
    
    # Language detection patterns
    language_patterns = {
        'python': [r'\.py$', r'requirements\.txt$', r'setup\.py$', r'Pipfile$'],
        'javascript': [r'\.js$', r'\.jsx$', r'package\.json$', r'yarn\.lock$', r'npm-shrinkwrap\.json$'],
        'typescript': [r'\.ts$', r'\.tsx$', r'tsconfig\.json$'],
        'java': [r'\.java$', r'pom\.xml$', r'build\.gradle$', r'\.jar$'],
        'go': [r'\.go$', r'go\.mod$', r'go\.sum$'],
        'ruby': [r'\.rb$', r'Gemfile$', r'\.gemspec$'],
        'php': [r'\.php$', r'composer\.json$'],
        'csharp': [r'\.cs$', r'\.csproj$', r'\.sln$'],
        'rust': [r'\.rs$', r'Cargo\.toml$'],
        'kotlin': [r'\.kt$', r'\.kts$'],
        'swift': [r'\.swift$', r'Package\.swift$'],
        'html': [r'\.html$', r'\.htm$'],
        'css': [r'\.css$', r'\.scss$', r'\.sass$', r'\.less$'],
        'shell': [r'\.sh$', r'\.bash$', r'\.zsh$'],
        'dockerfile': [r'Dockerfile', r'\.dockerfile$', r'docker-compose\.yml$'],
        'terraform': [r'\.tf$', r'\.tfvars$'],
        'yaml': [r'\.yaml$', r'\.yml$'],
    }
    
    # Framework detection patterns
    framework_patterns = {
        'django': [r'settings\.py$', r'wsgi\.py$', r'asgi\.py$', r'django', r'urls\.py$'],
        'flask': [r'flask', r'Flask\(', r'@app\.route'],
        'fastapi': [r'fastapi', r'FastAPI\(', r'@app\.get', r'@app\.post'],
        'express': [r'express\s*=\s*require', r'express\(', r'app\.get\(', r'app\.post\('],
        'react': [r'react', r'React', r'useState', r'useEffect', r'ReactDOM'],
        'angular': [r'@angular', r'NgModule', r'Component\('],
        'vue': [r'vue', r'createApp', r'new Vue'],
        'next.js': [r'next\.config', r'pages/\_app', r'getStaticProps'],
        'spring': [r'@SpringBootApplication', r'@RestController', r'@Autowired'],
        'laravel': [r'Illuminate\\', r'artisan'],
        'asp.net': [r'Microsoft\.AspNetCore', r'IActionResult'],
        'rails': [r'Rails::', r'ActiveRecord::'],
    }
    
    # Database detection patterns
    db_patterns = {
        'mongodb': [r'mongodb', r'mongoose', r'MongoClient'],
        'mysql': [r'mysql', r'MySQL', r'createConnection'],
        'postgresql': [r'postgresql', r'postgres', r'pg\s*=\s*require'],
        'sqlite': [r'sqlite', r'SQLite'],
        'redis': [r'redis', r'Redis'],
        'dynamodb': [r'dynamodb', r'DynamoDB'],
        'cosmosdb': [r'cosmosdb', r'CosmosClient'],
    }
    
    # Cloud service detection patterns
    cloud_patterns = {
        'aws': [r'aws-sdk', r'boto3', r'AWS\.', r'\.amazonaws\.com'],
        'azure': [r'azure-', r'Azure\.', r'\.azure\.com'],
        'gcp': [r'google-cloud', r'gcloud', r'\.googleapis\.com'],
        's3': [r'S3Client', r'S3Bucket', r'aws_s3', r'boto3.*?s3'],
        'dynamodb': [r'DynamoDBClient', r'boto3.*?dynamodb'],
        'lambda': [r'aws_lambda', r'boto3.*?lambda'],
        'ec2': [r'EC2Client', r'boto3.*?ec2'],
        'azure_blob': [r'BlobServiceClient', r'azure.storage.blob'],
        'azure_functions': [r'azure.functions'],
        'bigquery': [r'bigquery', r'BigQuery'],
        'pubsub': [r'pubsub', r'PubSub'],
        'gcs': [r'storage.Client', r'google.cloud.storage'],
    }
    
    # Containerization and orchestration patterns
    container_patterns = {
        'docker': [r'Dockerfile', r'docker-compose', r'ENTRYPOINT', r'WORKDIR'],
        'kubernetes': [r'kubernetes', r'kubectl', r'apiVersion:', r'kind: (Deployment|Service|ConfigMap|Secret)'],
        'helm': [r'Chart\.yaml', r'values\.yaml', r'templates/'],
    }
    
    # CI/CD detection patterns
    cicd_patterns = {
        'github_actions': [r'\.github/workflows', r'uses: actions/', r'on: \[push, pull_request\]'],
        'gitlab_ci': [r'\.gitlab-ci\.yml'],
        'jenkins': [r'Jenkinsfile'],
        'circle_ci': [r'\.circleci/config\.yml'],
        'travis': [r'\.travis\.yml'],
        'azure_devops': [r'azure-pipelines\.yml'],
    }
    
    # Monitoring and logging patterns
    monitoring_patterns = {
        'prometheus': [r'prometheus', r'Prometheus', r'prom/client'],
        'grafana': [r'grafana', r'Grafana'],
        'elk': [r'elasticsearch', r'kibana', r'logstash'],
        'datadog': [r'datadog', r'Datadog'],
        'newrelic': [r'newrelic', r'NewRelic'],
        'sentry': [r'sentry', r'Sentry.init'],
        'fluentd': [r'fluentd', r'Fluentd'],
    }
    
    # IaC detection patterns
    iac_patterns = {
        'terraform': [r'\.tf$', r'terraform', r'provider "aws"', r'resource "'],
        'cloudformation': [r'\.template$', r'AWSTemplateFormatVersion', r'Resources:'],
        'pulumi': [r'index\.ts$', r'Pulumi\.yaml', r'pulumi.'],
        'serverless': [r'serverless\.yml', r'serverless\.json'],
        'ansible': [r'ansible\.cfg', r'playbook\.yml'],
        'cdk': [r'cdk\.json', r'aws-cdk-lib'],
    }
    
    all_pattern_categories = {
        'languages': language_patterns,
        'frameworks': framework_patterns,
        'databases': db_patterns,
        'cloud_services': cloud_patterns,
        'containerization': container_patterns,
        'cicd': cicd_patterns,
        'monitoring': monitoring_patterns,
        'iac': iac_patterns,
    }
    
    results = {category: {} for category in all_pattern_categories}
    
    for filepath, content in files_data:
        # Check file extension and path patterns
        for category_name, category_patterns in all_pattern_categories.items():
            for tech, patterns in category_patterns.items():
                for pattern in patterns:
                    # Check in filepath
                    if re.search(pattern, filepath, re.IGNORECASE):
                        results[category_name][tech] = results[category_name].get(tech, 0) + 1
                    
                    # For content-based patterns (ignoring binary files and very large files)
                    if isinstance(content, str) and len(content) < 1000000:  # Skip content check for large files
                        if re.search(pattern, content, re.IGNORECASE):
                            results[category_name][tech] = results[category_name].get(tech, 0) + 1
    
    return results

def check_hardcoded_secrets(files_data):
    """Check for hardcoded secrets and credentials."""
    secret_patterns = [
        # AWS
        r'AKIA[0-9A-Z]{16}',  # AWS Access Key ID
        r'AWS_SECRET_ACCESS_KEY.*?=.*?[A-Za-z0-9+/]{40}',
        r'AWS_ACCESS_KEY_ID.*?=.*?AKIA[0-9A-Z]{16}',
        
        # Generic API keys and tokens
        r'api[-_]?key.*?[=:"\s]+[A-Za-z0-9]{32,}[\'"\s]',
        r'auth[-_]?token.*?[=:"\s]+[A-Za-z0-9]{32,}[\'"\s]',
        r'secret[-_]?key.*?[=:"\s]+[A-Za-z0-9]{32,}[\'"\s]',
        r'password.*?[=:"\s]+[A-Za-z0-9!@#$%^&*()]{8,}[\'"\s]',
        
        # Database connection strings
        r'mysql://.*:.*@.*',
        r'postgres://.*:.*@.*',
        r'mongodb://.*:.*@.*',
        
        # OAuth tokens
        r'oauth.*token.*?[=:"\s]+[A-Za-z0-9]{32,}[\'"\s]',
        
        # JWT tokens
        r'eyJ[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}',
    ]
    
    results = {
        'secrets_count': 0,
        'files_with_secrets': []
    }
    
    for filepath, content in files_data:
        # Skip binary files and very large files
        if not isinstance(content, str) or len(content) > 1000000:
            continue
            
        for pattern in secret_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                results['secrets_count'] += len(matches)
                results['files_with_secrets'].append(filepath)
                break  # Only count each file once
    
    return results

def analyze_architecture(file_analysis):
    """Analyze the architecture based on file analysis results."""
    languages = file_analysis['languages']
    frameworks = file_analysis['frameworks']
    cloud_services = file_analysis['cloud_services']
    containerization = file_analysis['containerization']
    databases = file_analysis['databases']
    
    # Determine if it's likely a microservices architecture
    microservices_indicators = [
        containerization.get('kubernetes', 0) > 0,
        containerization.get('docker', 0) > 2,  # Multiple Dockerfiles
        'docker-compose.yml' in [f for f, _ in file_analysis.get('files', [])],
        any(frameworks.get(fw, 0) > 0 for fw in ['fastapi', 'express', 'flask'])
    ]
    
    # Check for API design patterns
    api_indicators = {
        'rest': sum([
            frameworks.get('fastapi', 0),
            frameworks.get('flask', 0),
            frameworks.get('express', 0),
            frameworks.get('django', 0)
        ]),
        'grpc': sum([
            re.search(r'grpc', str([f for f, _ in file_analysis.get('files', [])])) is not None,
            re.search(r'\.proto$', str([f for f, _ in file_analysis.get('files', [])])) is not None
        ])
    }
    
    # Check for message queue usage
    mq_indicators = {
        'kafka': sum([
            re.search(r'kafka', str([f for f, _ in file_analysis.get('files', [])])) is not None,
            re.search(r'KafkaConsumer', str([c for _, c in file_analysis.get('files', [])])) is not None
        ]),
        'rabbitmq': sum([
            re.search(r'rabbitmq', str([f for f, _ in file_analysis.get('files', [])])) is not None,
            re.search(r'amqp', str([c for _, c in file_analysis.get('files', [])])) is not None
        ]),
        'sqs': cloud_services.get('aws', 0) > 0 and sum([
            re.search(r'sqs', str([f for f, _ in file_analysis.get('files', [])])) is not None,
            re.search(r'SQS', str([c for _, c in file_analysis.get('files', [])])) is not None
        ])
    }
    
    architecture = {
        'is_microservices': sum(microservices_indicators) >= 2,
        'apis': {k: v > 0 for k, v in api_indicators.items()},
        'message_queues': {k: v > 0 for k, v in mq_indicators.items()}
    }
    
    return architecture

def clean_llm_json(json_str):
    """
    Clean and repair common JSON formatting issues in LLM-generated responses.
    
    Args:
        json_str: String containing potentially malformed JSON
        
    Returns:
        Cleaned JSON string that is more likely to parse correctly
    """
    import re
    import json
    
    if not json_str:
        return "{}"
        
    # Normalize whitespace and remove escape characters that might interfere
    json_str = json_str.strip()
    
    # Replace any literal '\n' with actual newlines
    json_str = json_str.replace('\\n', '\n')
    
    # Remove control characters that break JSON
    json_str = re.sub(r'[\x00-\x1F\x7F]', '', json_str)
    
    # First, directly fix the missing comma issue like in test case 4
    # Pattern to match something like: "score": 8 "reasoning"
    json_str = re.sub(r'("[^"]+"\s*:\s*[^,{}\[\]"]+)\s+"', r'\1, "', json_str)
    
    # Fix unquoted property names - key pattern: word:
    json_str = re.sub(r'([{,])\s*([a-zA-Z0-9_]+)\s*:', r'\1"\2":', json_str)
    
    # Handle unquoted values - first find all property names
    property_pattern = r'"([^"]+)"\s*:\s*([^",{}\[\]\n]+)([,}\]])'
    
    def quote_if_needed(match):
        prop_name = match.group(1)
        value = match.group(2).strip()
        delimiter = match.group(3)
        
        # If it's already a valid number, boolean, or null, leave it as is
        if value.lower() in ['true', 'false', 'null'] or re.match(r'^-?\d+(\.\d+)?$', value):
            return f'"{prop_name}": {value}{delimiter}'
        else:
            # It's an unquoted string, so quote it
            return f'"{prop_name}": "{value}"{delimiter}'
    
    json_str = re.sub(property_pattern, quote_if_needed, json_str)
    
    # Fix missing commas between object properties
    # Look for: "key": value} "key":
    json_str = re.sub(r'(["}])\s*\}\s*"', r'\1}, "', json_str)
    
    # Fix missing commas between array items
    # Look for: "value"] "key":
    json_str = re.sub(r'(["}])\s*\]\s*"', r'\1], "', json_str)
    
    # Fix trailing commas which are invalid in JSON
    json_str = re.sub(r',\s*}', '}', json_str)
    json_str = re.sub(r',\s*]', ']', json_str)
    
    # Fix missing commas between array items
    json_str = re.sub(r'(["}0-9])\s+\[', r'\1, [', json_str)
    json_str = re.sub(r'(["}0-9])\s+{', r'\1, {', json_str)
    
    # Fix missing commas between items
    json_str = re.sub(r'"([^"]+)"\s+"([^"]+)"', r'"\1", "\2"', json_str)
    
    # Try to ensure proper JSON structure by adding missing commas and quotes
    try:
        parsed = json.loads(json_str)
        return json.dumps(parsed)
    except json.JSONDecodeError as e:
        error_pos = e.pos
        error_msg = str(e)
        print(f"Initial cleaning wasn't sufficient, trying targeted fix at position {error_pos}")
        print(f"Error: {error_msg}")
        
        # Special handling for missing comma case (test case 4)
        if "Expecting ',' delimiter" in error_msg:
            # Look backward from error position to find potential missing comma
            for i in range(error_pos, max(0, error_pos - 50), -1):
                if i < len(json_str) and json_str[i] == '"' and i > 0:
                    # Found a quote, check if it's after a value without a comma
                    before_quote = json_str[:i].rstrip()
                    # Check if the character before this is not a comma, colon, {, or [
                    if before_quote and before_quote[-1] not in [',', ':', '{', '[', '"']:
                        # Insert a comma
                        fixed_json = json_str[:i] + ',' + json_str[i:]
                        try:
                            # See if this fixed it
                            parsed = json.loads(fixed_json)
                            return json.dumps(parsed)
                        except:
                            # If not, continue
                            pass
        
        # If previous approach failed, move to aggressive recovery
        # Extract all property name-value pairs we can find
        properties = {}
        prop_matches = re.finditer(r'"([^"]+)"\s*:\s*([^,}\]]+)', json_str)
        
        for match in prop_matches:
            prop_name = match.group(1)
            value = match.group(2).strip()
            
            # Fix the value
            if value.startswith('"') and value.endswith('"'):
                # Already quoted string
                pass
            elif value.lower() in ['true', 'false', 'null'] or re.match(r'^-?\d+(\.\d+)?$', value):
                # Boolean, null, or number
                pass
            else:
                # Unquoted string
                value = f'"{value}"'
                
            properties[prop_name] = value
        
        # If we found properties, create a simple valid JSON
        if properties:
            result = "{"
            result += ", ".join([f'"{k}": {v}' for k, v in properties.items()])
            result += "}"
            return result
            
        # Last resort: return a minimal valid JSON if all else fails
        return '{"error": "Unable to parse JSON"}'

def repair_json_at_error(json_str, json_err):
    """
    Attempt to repair a JSON string at the specific position where parsing failed.
    
    Args:
        json_str: The JSON string that failed to parse
        json_err: The JSONDecodeError exception
        
    Returns:
        Potentially repaired JSON string
    """
    if not json_err:
        return json_str
        
    # Extract information about the error
    pos = json_err.pos
    line_no = json_err.lineno
    col_no = json_err.colno
    error_msg = str(json_err)
    
    # Get error context (snippet of text around the error)
    context_start = max(0, pos - 30)
    context_end = min(len(json_str), pos + 30)
    context = json_str[context_start:context_end]
    
    print(f"JSON error at position {pos}, line {line_no}, column {col_no}")
    print(f"Error message: {error_msg}")
    print(f"Context: {context}")
    
    # Check for common error patterns and fix them
    
    # 1. Unquoted values (most common issue with LLM-generated JSON)
    if "Expecting value" in error_msg or "Expecting '\"'" in error_msg:
        # Look for unquoted text after a colon
        unquoted_pattern = re.compile(r':\s*([^{}\[\]",:]+)([,}])')
        # Start searching from the error position backward to find the last key
        search_from = max(0, pos - 100)  # Look back up to 100 chars from error
        search_text = json_str[search_from:pos + 20]
        
        match = unquoted_pattern.search(search_text)
        if match:
            unquoted_value = match.group(1).strip()
            delimiter = match.group(2)
            # Replace the whole JSON string with the fix
            full_match = match.group(0)
            replacement = f': "{unquoted_value}"{delimiter}'
            return json_str.replace(full_match, replacement)
    
    # 2. Missing comma between array items or object properties
    if "Expecting ',' delimiter" in error_msg:
        # Look at this point and see if we need to insert a comma
        # This is tricky because we need to know if we're between array items or object properties
        if pos > 0 and pos < len(json_str) - 1:
            # Check if we're between a value and an opening bracket/brace
            if json_str[pos-1].strip() in ['"', '}', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] and json_str[pos].strip() in ['{', '[', '"']:
                # Insert a comma
                return json_str[:pos] + ',' + json_str[pos:]
    
    # 3. Trailing commas in arrays or objects
    if "Expecting" in error_msg and ("property name" in error_msg or "value" in error_msg):
        # Check for trailing comma
        trailing_comma_pattern = re.compile(r',\s*[}\]]')
        match = trailing_comma_pattern.search(json_str[max(0, pos-5):min(len(json_str), pos+5)])
        if match:
            # Replace the trailing comma
            full_match = match.group(0)
            replacement = full_match.replace(',', '')
            return json_str.replace(full_match, replacement)
    
    # If we couldn't fix it with specific rules, try a more aggressive approach:
    # Just insert quotes around any text at the error position that looks like it should be quoted
    if pos > 0:
        # Find the next delimiter after the error position
        next_delim_pos = None
        for i in range(pos, min(len(json_str), pos + 100)):
            if json_str[i] in [',', '}', ']']:
                next_delim_pos = i
                break
                
        if next_delim_pos:
            # Extract the value that's causing problems
            problematic_value = json_str[pos:next_delim_pos].strip()
            # If it's not already quoted and doesn't look like a number or boolean
            if (not problematic_value.startswith('"') 
                and not problematic_value.isdigit() 
                and problematic_value.lower() not in ['true', 'false', 'null']):
                # Quote it
                return json_str[:pos] + f'"{problematic_value}"' + json_str[next_delim_pos:]
    
    # If no specific fix worked, return the original
    return json_str

def analyze_cloud_readiness_with_llm(files_data, project_name=None):
    """Use LLM to analyze cloud readiness of the codebase.
    
    Args:
        files_data: List of (path, content) tuples
        project_name: Name of the project being analyzed
        
    Returns:
        Dict containing LLM-based cloud readiness assessment
    """
    from utils.call_llm import call_llm
    
    # Select a representative sample of files to analyze
    # We'll pick up to 10 key files for LLM analysis to avoid token limits
    sampled_files = []
    
    # Try to find important files first
    important_patterns = [
        r'Dockerfile', r'docker-compose', r'requirements.txt', r'package.json',
        r'app.py', r'server.js', r'main.py', r'index.js', r'terraform', 
        r'cloudformation', r'kubernetes', r'k8s', r'helm', r'config'
    ]
    
    # First pass: look for infrastructure and config files
    for filepath, content in files_data:
        if len(sampled_files) >= 10:
            break
            
        for pattern in important_patterns:
            if re.search(pattern, filepath, re.IGNORECASE):
                # Limit file content size
                if len(content) > 4000:
                    content = content[:2000] + "\n\n[...content truncated...]\n\n" + content[-2000:]
                sampled_files.append((filepath, content))
                break
    
    # Second pass: include other files up to our limit
    if len(sampled_files) < 10:
        for filepath, content in files_data:
            if filepath not in [f for f, _ in sampled_files]:
                # Skip very large files
                if len(content) > 4000:
                    content = content[:2000] + "\n\n[...content truncated...]\n\n" + content[-2000:]
                sampled_files.append((filepath, content))
                
                if len(sampled_files) >= 10:
                    break
    
    # Prepare content for LLM
    file_content_str = ""
    for filepath, content in sampled_files:
        file_content_str += f"\n--- {filepath} ---\n{content}\n"
    
    # Create the prompt for the LLM
    prompt = f"""
You are an expert cloud architect tasked with evaluating the cloud readiness of a codebase. 
Analyze these representative files from the project "{project_name}".

{file_content_str}

Provide a comprehensive assessment of the codebase's cloud readiness on the following factors:
1. Language & Runtime Compatibility: How compatible are the languages/runtimes with cloud environments?
2. Framework Support: Are the frameworks used cloud-friendly?
3. Configuration Management: How is configuration handled? Are there hardcoded values?
4. Environment Variables: Is the app properly configured to use environment variables?
5. External Service Coupling: How tightly coupled is the code to external services?
6. Logging & Observability: Are proper logging practices followed?
7. State Management: Is the application stateless or does it properly externalize state?
8. Code Modularity: Is the code modular and loosely coupled?
9. Dependency Management: How are dependencies managed?
10. Containerization: Is there container support (Docker, etc.)?
11. Cloud SDK Usage: Does the code use cloud provider SDKs?
12. Health Checks: Are there health check endpoints?
13. Testing: Is there adequate test coverage?
14. Instrumentation: Are there metrics, tracing, or monitoring?
15. Infrastructure as Code: Is infrastructure defined as code?

For each factor:
- Rate it on a 1-10 scale
- Explain your reasoning
- Provide specific recommendations for improvement

Then give an overall cloud readiness score (1-100) and a categorization:
- Cloud-Native (80-100): Ready for deployment with minimal changes
- Cloud-Ready (60-79): Requires some modifications but fundamentally sound
- Cloud-Friendly (40-59): Needs significant refactoring for optimal cloud deployment
- Cloud-Challenged (0-39): Major architectural changes needed for cloud adoption
"""

    # Format instructions for ensuring valid JSON
    json_format = """
Format your response as valid JSON with the following structure:
```json
{
  "factors": {
    "language_compatibility": {
      "score": 85,
      "reasoning": "The codebase uses Python which is well-supported in cloud environments.",
      "recommendations": "Consider containerizing the application for better portability."
    },
    "framework_support": {
      "score": 70,
      "reasoning": "The application uses Flask which works well in cloud environments.",
      "recommendations": "Add health check endpoints for better container orchestration."
    },
    "configuration": {
      "score": 50,
      "reasoning": "Configuration is partly stored in environment variables, but some values are hardcoded.",
      "recommendations": "Move all configuration to environment variables or a configuration service."
    },
    "service_coupling": {
      "score": 60,
      "reasoning": "Services are moderately coupled. External dependencies are referenced directly.",
      "recommendations": "Consider using a service discovery mechanism."
    },
    "logging_practices": {
      "score": 40,
      "reasoning": "Basic logging exists but lacks structured format and context.",
      "recommendations": "Implement structured logging with request IDs."
    },
    "state_management": {
      "score": 65,
      "reasoning": "State is managed reasonably, but could be more distributed.",
      "recommendations": "Consider using a distributed cache for session data."
    },
    "code_modularity": {
      "score": 70,
      "reasoning": "Code is fairly modular, but some components are tightly coupled.",
      "recommendations": "Apply the SOLID principles more consistently."
    },
    "dependency_management": {
      "score": 80,
      "reasoning": "Dependencies are well-managed with a proper package manager.",
      "recommendations": "Pin dependency versions for reproducible builds."
    },
    "containerization": {
      "score": 40,
      "reasoning": "No containerization found. The application runs directly on servers.",
      "recommendations": "Add a Dockerfile and container configuration."
    },
    "cloud_integration": {
      "score": 30,
      "reasoning": "Limited direct cloud SDK usage or integrations.",
      "recommendations": "Integrate with cloud monitoring and logging services."
    },
    "health_checks": {
      "score": 20,
      "reasoning": "No dedicated health check endpoints found.",
      "recommendations": "Add health check endpoints at /health and /ready."
    },
    "testing": {
      "score": 60,
      "reasoning": "Some tests exist but coverage could be improved.",
      "recommendations": "Increase test coverage and add integration tests."
    },
    "instrumentation": {
      "score": 25,
      "reasoning": "Minimal performance instrumentation and tracing.",
      "recommendations": "Add distributed tracing and performance monitoring."
    },
    "infrastructure_as_code": {
      "score": 15,
      "reasoning": "No infrastructure as code found.",
      "recommendations": "Implement Terraform or CloudFormation templates."
    }
  },
  "overall_score": 55,
  "readiness_level": "Cloud-Friendly",
  "summary": "The application shows some cloud readiness aspects but requires several improvements before being fully cloud-native.",
  "key_strengths": ["Good dependency management", "Reasonably modular code", "Cloud-compatible language choice"],
  "key_weaknesses": ["Lack of containerization", "No health checks", "Limited cloud service integration"]
}
```

IMPORTANT FORMATTING INSTRUCTIONS:
1. Your response MUST be valid JSON that can be parsed by Python's json.loads().
2. Use double quotes for ALL strings and property names.
3. Do not use trailing commas in lists or objects.
4. Always put quotes around ALL values that are not numbers or booleans.
5. Never use unquoted text values - all text must be in double quotes.
6. Keep all field keys consistent with the example structure.
7. Ensure complete, valid JSON that starts with { and ends with }.
8. Do not include any text outside the JSON block.
"""
    
    # Combine the prompt parts
    prompt = prompt + json_format

    # Call the LLM
    try:
        response = call_llm(prompt, use_cache=True)
        print("Received LLM response, extracting JSON...")
        
        # Extract the JSON from the response
        # First, try to find the JSON block with code markers
        json_str = None
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```', response)
        if json_match:
            json_str = json_match.group(1)
            print("Found JSON inside code block markers")
        else:
            # Try to find JSON without the code block markers - look for the largest {...} block
            json_match = re.search(r'(\{[\s\S]*\})', response)
            if json_match:
                json_str = json_match.group(1)
                print("Found JSON without code block markers")
            else:
                # Last resort - look for anything that might be JSON-like
                print("Couldn't find JSON block, attempting fallback extraction")
                # Find all lines that look like they could be part of a JSON object
                potential_json_lines = []
                in_json = False
                open_braces = 0
                for line in response.split('\n'):
                    if '{' in line and not in_json:
                        in_json = True
                        open_braces += line.count('{')
                        open_braces -= line.count('}')
                        potential_json_lines.append(line)
                    elif in_json:
                        potential_json_lines.append(line)
                        open_braces += line.count('{')
                        open_braces -= line.count('}')
                        if open_braces <= 0:
                            in_json = False
                
                if potential_json_lines:
                    json_str = '\n'.join(potential_json_lines)
                else:
                    raise ValueError("Could not extract JSON from LLM response")
        
        # Clean up the JSON string using our comprehensive cleaner
        if json_str:
            # Use the more comprehensive JSON cleaner
            json_str = clean_llm_json(json_str)
            
            # Print a small sample of the JSON string for debugging
            print(f"JSON sample (first 100 chars): {json_str[:100]}...")
        
        # Parse the JSON
        try:
            llm_analysis = json.loads(json_str)
            print("Successfully parsed JSON")
        except json.JSONDecodeError as json_err:
            print(f"JSON parsing error: {str(json_err)}")
            print(f"Problem at character {json_err.pos}, line {json_err.lineno}, column {json_err.colno}")
            print(f"Context: {json_str[max(0, json_err.pos-30):min(len(json_str), json_err.pos+30)]}")
            
            # Try selective repair at the exact error position
            repaired_json = repair_json_at_error(json_str, json_err)
            if repaired_json != json_str:
                try:
                    print("Attempting to parse selectively repaired JSON...")
                    llm_analysis = json.loads(repaired_json)
                    print("Successfully parsed repaired JSON")
                except json.JSONDecodeError:
                    # If selective repair failed, continue with other fallbacks
                    print("Selective repair failed")
            
            # If still failing, try a more lenient JSON parser if available
            if 'llm_analysis' not in locals():
                try:
                    import yaml
                    print("Attempting to parse with YAML as fallback")
                    # YAML is a superset of JSON and more forgiving
                    llm_analysis = yaml.safe_load(json_str)
                    print("Successfully parsed with YAML")
                except (ImportError, yaml.YAMLError) as yaml_err:
                    print(f"YAML parsing also failed: {str(yaml_err)}")
                    # Create minimal valid structure if all parsing fails
                    print("All parsing attempts failed, returning minimal structure")
                    return {
                        "factors": {},
                        "overall_score": 50,
                        "readiness_level": "Cloud-Friendly",
                        "summary": f"Error parsing LLM response: {str(json_err)}",
                        "key_strengths": ["Unable to determine due to parsing error"],
                        "key_weaknesses": ["Unable to determine due to parsing error"]
                    }
        
        # Validate the result has required fields
        required_fields = ["factors", "overall_score", "readiness_level", "summary"]
        missing_fields = [field for field in required_fields if field not in llm_analysis]
        if missing_fields:
            print(f"LLM response missing required fields: {missing_fields}")
            # Add missing fields with default values
            if "factors" in missing_fields:
                llm_analysis["factors"] = {}
            if "overall_score" in missing_fields:
                llm_analysis["overall_score"] = 50  # Default middle score
            if "readiness_level" in missing_fields:
                llm_analysis["readiness_level"] = "Cloud-Friendly"  # Default middle level
            if "summary" in missing_fields:
                llm_analysis["summary"] = "Analysis completed with limited data."
            
            # Add other optional fields if missing
            if "key_strengths" not in llm_analysis:
                llm_analysis["key_strengths"] = []
            if "key_weaknesses" not in llm_analysis:
                llm_analysis["key_weaknesses"] = []
        
        # Ensure factors is a dictionary
        if not isinstance(llm_analysis.get("factors", {}), dict):
            print("'factors' is not a dictionary, replacing with empty dict")
            llm_analysis["factors"] = {}
        
        # Normalize factor names if needed
        normalized_factors = {}
        factor_mapping = {
            "language_compatibility": "language_compatibility",
            "language_runtime_compatibility": "language_compatibility",
            "framework_support": "framework_support",
            "configuration_management": "configuration",
            "configuration": "configuration",
            "environment_variables": "configuration",
            "external_service_coupling": "service_coupling",
            "service_coupling": "service_coupling",
            "logging_observability": "logging_practices",
            "logging_practices": "logging_practices",
            "state_management": "state_management",
            "code_modularity": "code_modularity",
            "dependency_management": "dependency_management",
            "containerization": "containerization",
            "cloud_sdk_usage": "cloud_integration",
            "cloud_integration": "cloud_integration",
            "health_checks": "health_checks",
            "testing": "testing",
            "test_coverage": "testing",
            "instrumentation": "instrumentation",
            "infrastructure_as_code": "infrastructure_as_code",
            "iac": "infrastructure_as_code"
        }
        
        for factor, data in llm_analysis["factors"].items():
            normalized_name = factor_mapping.get(factor.lower(), factor.lower())
            # Ensure each factor has the expected structure
            if not isinstance(data, dict):
                data = {"score": 5, "reasoning": "", "recommendations": ""}
            elif "score" not in data:
                data["score"] = 5
            normalized_factors[normalized_name] = data
        
        llm_analysis["factors"] = normalized_factors
        
        return llm_analysis
    
    except Exception as e:
        print(f"Error in LLM-based cloud readiness analysis: {str(e)}")
        # Return a minimal structure in case of error
        return {
            "factors": {},
            "overall_score": 50,
            "readiness_level": "Cloud-Friendly",
            "summary": f"Error performing LLM analysis: {str(e)}",
            "key_strengths": ["Unable to determine due to error"],
            "key_weaknesses": ["Unable to determine due to error"],
            "error": str(e)
        }

def analyze_cloud_readiness(files_data, project_name=None, github_token=None, use_llm=True):
    """Analyze the codebase for cloud readiness.
    
    Args:
        files_data: List of (path, content) tuples
        project_name: Name of the project being analyzed
        github_token: GitHub token for API requests (optional)
        use_llm: Whether to incorporate LLM-based analysis (default: True)
        
    Returns:
        Dict containing cloud readiness analysis results
    """
    # Perform rule-based analysis
    tech_analysis = detect_language_frameworks(files_data)
    secrets_analysis = check_hardcoded_secrets(files_data)
    env_vars_analysis = check_environment_variables(files_data)
    coupling_analysis = analyze_service_coupling(files_data)
    logging_analysis = analyze_logging_practices(files_data)
    state_management = analyze_state_management(files_data)
    modularity_analysis = analyze_code_modularity(files_data)
    dependency_analysis = analyze_dependency_management(files_data)
    health_check_analysis = detect_health_check_endpoints(files_data)
    testing_analysis = analyze_testing_coverage(files_data)
    instrumentation_analysis = analyze_instrumentation(files_data)
    
    # Add files to tech_analysis for architecture analysis
    tech_analysis['files'] = files_data
    architecture = analyze_architecture(tech_analysis)
    
    # Calculate cloud readiness scores from rule-based analysis
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
    
    # Perform LLM-based analysis if requested
    llm_analysis = None
    if use_llm:
        llm_analysis = analyze_cloud_readiness_with_llm(files_data, project_name)
    
    # Combine scores if LLM analysis is available
    scores = rule_based_scores
    if llm_analysis and use_llm:
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
                blended_scores[factor] = 0.6 * rule_based_scores[factor] + 0.4 * llm_scores[factor]
            else:
                blended_scores[factor] = rule_based_scores[factor]
        
        # Calculate overall score
        overall_sum = sum([blended_scores[f] for f in blended_scores if f != 'overall'])
        
        # Normalize to 0-100 range
        total_possible_score = sum(max_score_map.values())
        blended_scores['overall'] = max(0, min(round((overall_sum / total_possible_score) * 100), 100))
        
        # Use the blended scores
        scores = blended_scores
    
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
    
    # Generate recommendations
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
    
    # Create the final report
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
    if llm_analysis and use_llm:
        # Add relevant parts of LLM analysis
        report['llm_analysis'] = {
            'summary': llm_analysis.get('summary', ''),
            'key_strengths': llm_analysis.get('key_strengths', []),
            'key_weaknesses': llm_analysis.get('key_weaknesses', []),
            'factors': llm_analysis.get('factors', {}),
        }
        # Add LLM recommendations to our rule-based ones
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
    
    return report

def check_environment_variables(files_data):
    """Analyze the use of environment variables in the code."""
    env_var_patterns = [
        r'os\.environ\.get\([\'"](\w+)[\'"]',  # Python
        r'process\.env\.(\w+)',  # Node.js
        r'ENV\[[\'"](\w+)[\'"]\]',  # Ruby
        r'getenv\([\'"](\w+)[\'"]',  # C/C++
        r'System\.getenv\([\'"](\w+)[\'"]',  # Java
        r'\$\{(\w+)\}',  # Shell/Docker
        r'@Value\(\$\{(\w+)\}\)',  # Spring
    ]
    
    results = {
        'count': 0,
        'variables': set(),
        'files': []
    }
    
    for filepath, content in files_data:
        if not isinstance(content, str) or len(content) > 1000000:
            continue
            
        file_has_env_vars = False
        for pattern in env_var_patterns:
            matches = re.findall(pattern, content)
            if matches:
                results['count'] += len(matches)
                results['variables'].update(matches)
                file_has_env_vars = True
        
        if file_has_env_vars:
            results['files'].append(filepath)
    
    results['variables'] = list(results['variables'])  # Convert set to list for JSON serialization
    return results

def analyze_service_coupling(files_data):
    """Analyze how tightly coupled the application is to external services."""
    service_patterns = {
        'direct_http': [r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'],
        'hardcoded_ips': [r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'],
        'hardcoded_hostnames': [r'[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+'],
    }
    
    results = {
        'count': 0,
        'services': {},
        'files': []
    }
    
    for filepath, content in files_data:
        if not isinstance(content, str) or len(content) > 1000000:
            continue
            
        file_has_services = False
        for service_type, patterns in service_patterns.items():
            if service_type not in results['services']:
                results['services'][service_type] = []
                
            for pattern in patterns:
                matches = re.findall(pattern, content)
                if matches:
                    # Filter out common false positives
                    filtered_matches = [m for m in matches if 
                                      not m.startswith('http://localhost') and 
                                      not m.startswith('https://localhost') and
                                      not m == '127.0.0.1']
                    if filtered_matches:
                        results['count'] += len(filtered_matches)
                        results['services'][service_type].extend(filtered_matches)
                        file_has_services = True
        
        if file_has_services:
            results['files'].append(filepath)
    
    # Remove duplicates
    for service_type in results['services']:
        results['services'][service_type] = list(set(results['services'][service_type]))
    
    return results

def analyze_logging_practices(files_data):
    """Analyze logging practices in the codebase."""
    logging_patterns = {
        'structured_logging': [
            r'logger\.(info|debug|error|warn)\(\{',  # JSON logging
            r'structlog',  # Python structlog
            r'winston',  # Node.js Winston
            r'bunyan',  # Node.js Bunyan
            r'logstash',
        ],
        'basic_logging': [
            r'(console|logger)\.(log|info|debug|error|warn)\(',
            r'System\.out\.println',
            r'Log\.(d|i|e|v|w)',
            r'print\(',
            r'puts\s',
        ],
        'log_levels': [
            r'(LOG|Log)_LEVEL',
            r'setLevel',
        ]
    }
    
    results = {
        'structured_logging': 0,
        'basic_logging': 0,
        'log_levels': 0,
        'files': []
    }
    
    for filepath, content in files_data:
        if not isinstance(content, str) or len(content) > 1000000:
            continue
            
        file_has_logging = False
        for log_type, patterns in logging_patterns.items():
            for pattern in patterns:
                matches = re.findall(pattern, content)
                if matches:
                    results[log_type] += len(matches)
                    file_has_logging = True
        
        if file_has_logging:
            results['files'].append(filepath)
    
    return results

def analyze_state_management(files_data):
    """Analyze state management practices in the codebase."""
    state_patterns = {
        'stateless': [
            r'@Stateless',  # Java EE
            r'StatelessWidget',  # Flutter
            r'pure\s+function',  # JavaScript
        ],
        'persistent_state': [
            r'localStorage',  # Browser
            r'sessionStorage',  # Browser
            r'SharedPreferences',  # Android
            r'UserDefaults',  # iOS
            r'createStore',  # Redux
            r'useState',  # React
            r'@State',  # Swift
        ],
        'database_state': [
            r'database',
            r'repository',
            r'persist',
            r'entity',
            r'model',
        ]
    }
    
    results = {
        'stateless': 0,
        'persistent_state': 0,
        'database_state': 0,
        'files': []
    }
    
    for filepath, content in files_data:
        if not isinstance(content, str) or len(content) > 1000000:
            continue
            
        file_has_state = False
        for state_type, patterns in state_patterns.items():
            for pattern in patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                if matches:
                    results[state_type] += len(matches)
                    file_has_state = True
        
        if file_has_state:
            results['files'].append(filepath)
    
    return results

def analyze_code_modularity(files_data):
    """Analyze the modularity of the codebase."""
    modularity_patterns = {
        'classes': [
            r'class\s+\w+',
            r'interface\s+\w+',
        ],
        'functions': [
            r'(function|def|func)\s+\w+',
            r'const\s+\w+\s*=\s*(\(.*\)|async\s*\(.*\))\s*=>',
        ],
        'modules': [
            r'(import|require|use)\s+',
            r'module\.',
            r'export\s+',
        ]
    }
    
    results = {
        'classes': 0,
        'functions': 0,
        'modules': 0,
        'avg_file_size': 0,
        'file_count': 0
    }
    
    total_size = 0
    file_count = 0
    
    for filepath, content in files_data:
        if not isinstance(content, str):
            continue
            
        file_count += 1
        total_size += len(content)
        
        for mod_type, patterns in modularity_patterns.items():
            for pattern in patterns:
                matches = re.findall(pattern, content)
                if matches:
                    results[mod_type] += len(matches)
    
    if file_count > 0:
        results['avg_file_size'] = total_size / file_count
        results['file_count'] = file_count
    
    return results

def analyze_dependency_management(files_data):
    """Analyze dependency management in the codebase."""
    dependency_files = {
        'python': ['requirements.txt', 'setup.py', 'Pipfile', 'pyproject.toml'],
        'javascript': ['package.json', 'yarn.lock', 'package-lock.json'],
        'java': ['pom.xml', 'build.gradle', 'build.gradle.kts'],
        'ruby': ['Gemfile', 'Gemfile.lock'],
        'go': ['go.mod', 'go.sum'],
        'php': ['composer.json', 'composer.lock'],
        'rust': ['Cargo.toml', 'Cargo.lock'],
        'dotnet': ['*.csproj', '*.fsproj', 'packages.config'],
    }
    
    results = {
        'has_dependency_management': False,
        'dependency_systems': {},
        'dependency_files': []
    }
    
    for filepath, _ in files_data:
        filename = os.path.basename(filepath)
        for language, dep_files in dependency_files.items():
            for dep_file in dep_files:
                if dep_file == filename or (dep_file.startswith('*') and filename.endswith(dep_file[1:])):
                    results['has_dependency_management'] = True
                    results['dependency_systems'][language] = results['dependency_systems'].get(language, 0) + 1
                    results['dependency_files'].append(filepath)
    
    return results

def detect_health_check_endpoints(files_data):
    """Detect health check endpoints in the code."""
    health_patterns = [
        r'@GetMapping\([\'"]/?health[\'"]',  # Spring
        r'app\.get\([\'"]/?health[\'"]',  # Express
        r'@app\.route\([\'"]/?health[\'"]',  # Flask
        r'\.route\([\'"]/?health[\'"]',  # Node.js/Express
        r'func\s+Health',  # Go
        r'def\s+health',  # Python
        r'\.get\([\'"]/?health[\'"]',  # Various frameworks
        r'\.get\([\'"]/?status[\'"]',
        r'\.get\([\'"]/?ready[\'"]',
        r'\.get\([\'"]/?alive[\'"]',
        r'\.get\([\'"]/?livez[\'"]',
        r'\.get\([\'"]/?readyz[\'"]',
    ]
    
    results = {
        'has_health_endpoints': False,
        'count': 0,
        'files': []
    }
    
    for filepath, content in files_data:
        if not isinstance(content, str) or len(content) > 1000000:
            continue
            
        for pattern in health_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                results['has_health_endpoints'] = True
                results['count'] += len(matches)
                results['files'].append(filepath)
                break
    
    return results

def analyze_testing_coverage(files_data):
    """Analyze testing coverage in the codebase."""
    test_patterns = {
        'unit_tests': [
            r'@Test',  # Java
            r'test\([\'"]',  # JavaScript
            r'describe\([\'"]',  # JavaScript
            r'it\([\'"]',  # JavaScript
            r'def\s+test_',  # Python
            r'class\s+\w+Test',  # Java
            r'func\s+Test\w+',  # Go
        ],
        'integration_tests': [
            r'@SpringBootTest',  # Spring
            r'@IntegrationTest',
            r'integration\s+test',
            r'end-to-end',
            r'e2e',
        ],
        'mocking': [
            r'mock\(',
            r'@Mock',
            r'createMock',
            r'jest\.mock',
            r'unittest\.mock',
        ]
    }
    
    results = {
        'has_tests': False,
        'unit_tests': 0,
        'integration_tests': 0,
        'mocking': 0,
        'test_files': 0,
        'files': []
    }
    
    for filepath, content in files_data:
        # Count test files
        if 'test' in filepath.lower() or 'spec' in filepath.lower():
            results['test_files'] += 1
            results['has_tests'] = True
            results['files'].append(filepath)
        
        if not isinstance(content, str) or len(content) > 1000000:
            continue
            
        for test_type, patterns in test_patterns.items():
            for pattern in patterns:
                matches = re.findall(pattern, content)
                if matches:
                    results[test_type] += len(matches)
                    results['has_tests'] = True
                    if filepath not in results['files']:
                        results['files'].append(filepath)
    
    return results

def analyze_instrumentation(files_data):
    """Analyze instrumentation and observability in the codebase."""
    instrumentation_patterns = {
        'metrics': [
            r'metrics\.',
            r'prometheus',
            r'counter\.',
            r'gauge\.',
            r'histogram\.',
            r'meter\.',
        ],
        'tracing': [
            r'tracer',
            r'span',
            r'opentracing',
            r'opentelemetry',
            r'distributed_tracing',
            r'jaeger',
            r'zipkin',
        ],
        'profiling': [
            r'profiler',
            r'profile\.',
            r'benchmark',
        ]
    }
    
    results = {
        'has_instrumentation': False,
        'metrics': 0,
        'tracing': 0,
        'profiling': 0,
        'files': []
    }
    
    for filepath, content in files_data:
        if not isinstance(content, str) or len(content) > 1000000:
            continue
            
        file_has_instrumentation = False
        for instr_type, patterns in instrumentation_patterns.items():
            for pattern in patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                if matches:
                    results[instr_type] += len(matches)
                    file_has_instrumentation = True
        
        if file_has_instrumentation:
            results['has_instrumentation'] = True
            results['files'].append(filepath)
    
    return results

def calculate_cloud_readiness_scores(tech_analysis, secrets_analysis, architecture, 
                                    env_vars_analysis=None, coupling_analysis=None,
                                    logging_analysis=None, state_management=None,
                                    modularity_analysis=None, dependency_analysis=None,
                                    health_check_analysis=None, testing_analysis=None,
                                    instrumentation_analysis=None):
    """Calculate cloud readiness scores based on analysis."""
    scores = {}
    
    # Language and Framework Compatibility (15%)
    language_score = 0
    cloud_friendly_languages = ['python', 'javascript', 'typescript', 'go', 'java', 'ruby', 'php', 'csharp']
    for lang in cloud_friendly_languages:
        if tech_analysis['languages'].get(lang, 0) > 0:
            language_score += 2
    # Cap at max score
    scores['language_compatibility'] = min(language_score, 15)
    
    # Containerization score (15%)
    containerization_score = 0
    if tech_analysis['containerization'].get('docker', 0) > 0:
        containerization_score += 10
    if tech_analysis['containerization'].get('kubernetes', 0) > 0:
        containerization_score += 5
    scores['containerization'] = min(containerization_score, 15)
    
    # CI/CD score (10%)
    cicd_score = min(10, sum(tech_analysis['cicd'].values()) * 3)
    scores['ci_cd'] = cicd_score
    
    # Configuration management score (10%)
    config_score = 10
    if secrets_analysis['secrets_count'] > 0:
        config_score -= min(5, secrets_analysis['secrets_count'])
    
    # Environment variables (good practice)
    if env_vars_analysis and env_vars_analysis['count'] > 0:
        config_score += min(5, env_vars_analysis['count'] // 2)
    
    scores['configuration'] = max(0, min(config_score, 10))
    
    # Cloud service integration score (10%)
    cloud_score = min(10, sum(tech_analysis['cloud_services'].values()))
    scores['cloud_integration'] = cloud_score
    
    # External Service Coupling (5%)
    coupling_score = 5
    if coupling_analysis and coupling_analysis['count'] > 0:
        # Deduct points for tight coupling
        coupling_score -= min(5, coupling_analysis['count'] // 3)
    scores['service_coupling'] = max(0, coupling_score)
    
    # Logging and Observability (5%)
    logging_score = 0
    if logging_analysis:
        if logging_analysis['structured_logging'] > 0:
            logging_score += 3
        if logging_analysis['basic_logging'] > 0:
            logging_score += 1
        if logging_analysis['log_levels'] > 0:
            logging_score += 1
    scores['logging_practices'] = min(logging_score, 5)
    
    # State Management (5%)
    state_score = 0
    if state_management:
        if state_management['stateless'] > 0:
            state_score += 3
        if state_management['database_state'] > 0:
            state_score += 2
    scores['state_management'] = min(state_score, 5)
    
    # Code Modularity (5%)
    modularity_score = 0
    if modularity_analysis:
        if modularity_analysis['classes'] > 0 and modularity_analysis['functions'] > 0:
            modularity_score += 2
        if modularity_analysis['modules'] > 0:
            modularity_score += 3
    scores['code_modularity'] = min(modularity_score, 5)
    
    # Dependency Management (5%)
    dependency_score = 0
    if dependency_analysis and dependency_analysis['has_dependency_management']:
        dependency_score = 5
    scores['dependency_management'] = dependency_score
    
    # Health Checks (5%)
    health_score = 0
    if health_check_analysis and health_check_analysis['has_health_endpoints']:
        health_score = 5
    scores['health_checks'] = health_score
    
    # Testing (5%)
    testing_score = 0
    if testing_analysis:
        if testing_analysis['has_tests']:
            testing_score += 2
        if testing_analysis['unit_tests'] > 0:
            testing_score += 2
        if testing_analysis['integration_tests'] > 0:
            testing_score += 1
    scores['testing'] = min(testing_score, 5)
    
    # Instrumentation (5%)
    instrumentation_score = 0
    if instrumentation_analysis:
        if instrumentation_analysis['metrics'] > 0:
            instrumentation_score += 2
        if instrumentation_analysis['tracing'] > 0:
            instrumentation_score += 2
        if instrumentation_analysis['profiling'] > 0:
            instrumentation_score += 1
    scores['instrumentation'] = min(instrumentation_score, 5)
    
    # Infrastructure as Code score (5%)
    iac_score = min(5, sum(tech_analysis['iac'].values()))
    scores['infrastructure_as_code'] = iac_score
    
    # Calculate the sum of all factor scores
    raw_score = (
        scores['language_compatibility'] +
        scores['containerization'] +
        scores['ci_cd'] +
        scores['configuration'] +
        scores['cloud_integration'] +
        scores['service_coupling'] +
        scores['logging_practices'] +
        scores['state_management'] +
        scores['code_modularity'] +
        scores['dependency_management'] +
        scores['health_checks'] +
        scores['testing'] +
        scores['instrumentation'] +
        scores['infrastructure_as_code']
    )
    
    # Calculate the total possible score (sum of all max_score_map values)
    total_possible_score = sum(max_score_map.values())
    
    # Normalize to a 0-100 scale
    normalized_score = round((raw_score / total_possible_score) * 100)
    
    # Ensure the score is within 0-100 range
    scores['overall'] = max(0, min(normalized_score, 100))
    
    # Ensure each individual score is capped at its maximum value
    for key in scores:
        if key != 'overall':
            max_score = max_score_map.get(key, 5)  # Default to 5 if not in map
            scores[key] = min(scores[key], max_score)
    
    return scores

def generate_recommendations(tech_analysis, secrets_analysis, architecture, scores,
                            env_vars_analysis=None, coupling_analysis=None,
                            logging_analysis=None, state_management=None,
                            modularity_analysis=None, dependency_analysis=None,
                            health_check_analysis=None, testing_analysis=None,
                            instrumentation_analysis=None):
    """Generate recommendations based on analysis and scores."""
    recommendations = []
    
    # Language and Framework recommendations
    if scores['language_compatibility'] < 10:
        recommendations.append({
            'category': 'language_compatibility',
            'priority': 'medium',
            'description': 'Consider using more cloud-friendly languages and frameworks like Python, JavaScript/TypeScript, Go, or Java for better cloud compatibility.'
        })
    
    # Containerization recommendations
    if scores['containerization'] < 10:
        recommendations.append({
            'category': 'containerization',
            'priority': 'high',
            'description': 'Containerize your application using Docker for better portability and deployment consistency.'
        })
    
    if scores['containerization'] < 15:
        recommendations.append({
            'category': 'containerization',
            'priority': 'medium',
            'description': 'Consider using Kubernetes for container orchestration to improve scalability and resilience.'
        })
    
    # CI/CD recommendations
    if scores['ci_cd'] < 5:
        recommendations.append({
            'category': 'ci_cd',
            'priority': 'high',
            'description': 'Implement CI/CD pipelines using GitHub Actions, GitLab CI, or Jenkins to automate testing and deployment.'
        })
    
    # Configuration recommendations
    if secrets_analysis['secrets_count'] > 0:
        recommendations.append({
            'category': 'configuration',
            'priority': 'critical',
            'description': f'Remove {secrets_analysis["secrets_count"]} hardcoded secrets found in {len(secrets_analysis["files_with_secrets"])} files and use environment variables or a secrets management service instead.'
        })
    
    if env_vars_analysis and env_vars_analysis['count'] < 5:
        recommendations.append({
            'category': 'configuration',
            'priority': 'high',
            'description': 'Use more environment variables for configuration to improve flexibility when deploying to different environments.'
        })
    
    # Cloud service integration recommendations
    if scores['cloud_integration'] < 5:
        recommendations.append({
            'category': 'cloud_integration',
            'priority': 'medium',
            'description': 'Integrate with cloud services for storage, database, and compute resources to improve scalability.'
        })
    
    # Service coupling recommendations
    if coupling_analysis and coupling_analysis['count'] > 10:
        recommendations.append({
            'category': 'service_coupling',
            'priority': 'medium',
            'description': 'Reduce tight coupling to external services by using environment variables, configuration files, or service discovery.'
        })
    
    # Logging recommendations
    if logging_analysis and logging_analysis['structured_logging'] == 0:
        recommendations.append({
            'category': 'logging',
            'priority': 'medium',
            'description': 'Implement structured logging to improve observability in a cloud environment.'
        })
    
    # State management recommendations
    if state_management and state_management['stateless'] == 0:
        recommendations.append({
            'category': 'state_management',
            'priority': 'medium',
            'description': 'Design more stateless components to improve scalability and resilience in the cloud.'
        })
    
    # Code modularity recommendations
    if modularity_analysis and scores['code_modularity'] < 3:
        recommendations.append({
            'category': 'code_modularity',
            'priority': 'medium',
            'description': 'Improve code modularity by organizing code into more reusable modules and components.'
        })
    
    # Dependency management recommendations
    if dependency_analysis and not dependency_analysis['has_dependency_management']:
        recommendations.append({
            'category': 'dependency_management',
            'priority': 'high',
            'description': 'Use a dependency management system to track and manage dependencies properly.'
        })
    
    # Health check recommendations
    if health_check_analysis and not health_check_analysis['has_health_endpoints']:
        recommendations.append({
            'category': 'health_checks',
            'priority': 'high',
            'description': 'Implement health check endpoints to enable monitoring and auto-healing in cloud environments.'
        })
    
    # Testing recommendations
    if testing_analysis and not testing_analysis['has_tests']:
        recommendations.append({
            'category': 'testing',
            'priority': 'medium',
            'description': 'Add automated tests to ensure reliability when deploying to the cloud.'
        })
    
    # Instrumentation recommendations
    if instrumentation_analysis and not instrumentation_analysis['has_instrumentation']:
        recommendations.append({
            'category': 'instrumentation',
            'priority': 'medium',
            'description': 'Add metrics, tracing, and monitoring instrumentation to improve observability in the cloud.'
        })
    
    # IaC recommendations
    if scores['infrastructure_as_code'] < 3:
        recommendations.append({
            'category': 'infrastructure_as_code',
            'priority': 'medium',
            'description': 'Use Infrastructure as Code tools like Terraform or CloudFormation to manage and version your infrastructure.'
        })
    
    # Specialized recommendations based on architecture
    if architecture['is_microservices'] and scores['cloud_integration'] < 7:
        recommendations.append({
            'category': 'architecture',
            'priority': 'high',
            'description': 'Your microservices architecture would benefit from better cloud service integration for inter-service communication and data storage.'
        })
    
    if not architecture['is_microservices'] and sum(tech_analysis['containerization'].values()) > 0:
        recommendations.append({
            'category': 'architecture',
            'priority': 'low',
            'description': 'Consider breaking your monolithic application into microservices for better scalability and maintainability in the cloud.'
        })
    
    return recommendations

if __name__ == "__main__":
    # Test with a sample file
    print("Cloud analyzer utility module") 