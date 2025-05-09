#!/usr/bin/env python3
import json
from utils.cloud_analyzer import clean_llm_json, repair_json_at_error

def test_json_cleaner():
    """Test the JSON cleaner and repair functions on various malformed JSON strings."""
    test_cases = [
        # Case 1: Unquoted value in reasoning field
        {
            "name": "Unquoted value",
            "input": '{"factors": {"logging_practices": {"score": 8, "reasoning": The logging configuration is good}}}',
            "should_pass": True
        },
        # Case 2: Missing quotes around property names
        {
            "name": "Unquoted property names",
            "input": '{factors: {"logging_practices": {"score": 8, "reasoning": "The logging is good"}}}',
            "should_pass": True
        },
        # Case 3: Trailing commas
        {
            "name": "Trailing comma",
            "input": '{"factors": {"logging_practices": {"score": 8, "reasoning": "The logging is good"},}}',
            "should_pass": True
        },
        # Case 4: Missing comma between object properties
        {
            "name": "Missing comma",
            "input": '{"factors": {"logging_practices": {"score": 8 "reasoning": "The logging is good"}}}',
            "should_pass": True
        },
        # Case 5: Real-world example with multiple issues
        {
            "name": "Complex real-world example",
            "input": '''
            {
              "factors": {
                "language_compatibility": {
                  "score": 75,
                  "reasoning": The codebase primarily uses JavaScript/TypeScript which is widely supported in cloud environments,
                  "recommendations": "Consider standardizing on TypeScript across the entire codebase for better type safety."
                },
                "framework_support": {
                  "score": 80,
                  "reasoning": "Uses Next.js which works very well in cloud environments",
                  "recommendations": "Ensure you're using the latest version with serverless function support."
                }
              },
              "overall_score": 76,
              "readiness_level": "Cloud-Ready",
              "summary": "The application has good fundamentals for cloud deployment but needs some improvements.",
              "key_strengths": ["Modern JavaScript framework", "Good file organization", "Cloud-compatible language"]
              "key_weaknesses": ["Some hardcoded configuration", "Limited monitoring capabilities"]
            }
            ''',
            "should_pass": True
        }
    ]
    
    print("Testing JSON cleaner function...")
    
    for i, test_case in enumerate(test_cases):
        print(f"\nTest case {i+1}: {test_case['name']}")
        
        # First try direct parsing
        try:
            json.loads(test_case["input"])
            print("✅ Original parsed successfully (no cleaning needed)")
            continue
        except json.JSONDecodeError as e:
            print(f"❌ Original JSON parsing error: {str(e)}")
        
        # Try with our cleaner
        cleaned_json = clean_llm_json(test_case["input"])
        print(f"Cleaned JSON: {cleaned_json[:100]}...")
        
        try:
            parsed = json.loads(cleaned_json)
            print(f"✅ Successfully parsed after cleaning")
            if "factors" in parsed:
                print(f"Factors found: {list(parsed['factors'].keys())}")
        except json.JSONDecodeError as e:
            print(f"❌ Still failed after cleaning: {str(e)}")
            
            # Now try selective repair
            try:
                repaired_json = repair_json_at_error(cleaned_json, e)
                parsed = json.loads(repaired_json)
                print(f"✅ Successfully parsed after selective repair")
                if "factors" in parsed:
                    print(f"Factors found: {list(parsed['factors'].keys())}")
            except json.JSONDecodeError as e2:
                print(f"❌ Still failed after repair: {str(e2)}")
                if test_case["should_pass"]:
                    print("⚠️ This test case should have passed!")

if __name__ == "__main__":
    test_json_cleaner() 