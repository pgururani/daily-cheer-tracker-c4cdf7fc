
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="text-center bg-white shadow-md rounded-lg p-8 max-w-md w-full">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mx-auto mb-4">
          <span className="text-red-500 text-2xl font-bold">404</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-gray-600 mb-6">
          The page you're looking for doesn't exist or was moved.
          {location.pathname && (
            <span className="block text-sm mt-1 text-gray-500">
              Path: {location.pathname}
            </span>
          )}
        </p>
        <Button
          onClick={() => window.location.href = "/"}
          className="inline-flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Return to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
