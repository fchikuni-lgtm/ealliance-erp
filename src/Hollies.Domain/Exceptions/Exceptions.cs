namespace Hollies.Domain.Exceptions;

public class NotFoundException(string name, object key)
    : Exception($"Entity '{name}' with key '{key}' was not found.");

public class ForbiddenException(string message = "You do not have permission to perform this action.")
    : Exception(message);

public class ValidationException(string message)
    : Exception(message);

public class BusinessRuleException(string message)
    : Exception(message);

public class DuplicateException(string name)
    : Exception($"A '{name}' with that value already exists.");
