
import Header from '../components/Header';

const LoginPage = () => {
  return (
    <>
    <Header />
    <div className="login-page">
      <div className="login-container">
        <h2>Admin Login</h2>
        <form className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" required />
          </div>
          <button type="submit" className="btn btn-primary">Login</button>
        </form>
      </div>
    </div>
    </>
  );
};

export default LoginPage;
