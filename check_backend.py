import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

print("Checking backend syntax...")

try:
    import core.providers.llm_provider
    print("✅ core.providers.llm_provider imported successfully")
except Exception as e:
    print(f"❌ Error in core.providers.llm_provider: {e}")

try:
    import core.providers.openai_provider
    print("✅ core.providers.openai_provider imported successfully")
except Exception as e:
    print(f"❌ Error in core.providers.openai_provider: {e}")

try:
    import api.routes.intention_task
    print("✅ api.routes.intention_task imported successfully")
except Exception as e:
    print(f"❌ Error in api.routes.intention_task: {e}")
